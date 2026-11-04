import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const loggerPath = path.join(workspaceRoot, "scripts", "log-task-status.mjs");
const temporaryRoots: string[] = [];

function createFixture(tasks: string): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "task-status-log-"));
  temporaryRoots.push(root);
  writeFileSync(path.join(root, "TASKS.md"), tasks, "utf8");
  return root;
}

function git(root: string, ...args: string[]): void {
  execFileSync(
    "git",
    ["-C", root, "-c", "user.name=test", "-c", "user.email=test@example.invalid", ...args],
    { stdio: "ignore" },
  );
}

function commitTasks(root: string, tasks: string, message: string): void {
  writeFileSync(path.join(root, "TASKS.md"), tasks, "utf8");
  git(root, "add", "TASKS.md");
  git(root, "commit", "-q", "-m", message);
}

function createGitFixture(tasks: string): string {
  const root = createFixture(tasks);
  git(root, "init", "-q", "-b", "main");
  git(root, "add", "TASKS.md");
  git(root, "commit", "-q", "-m", "init");
  return root;
}

function logRows(root: string): string[] {
  try {
    return readFileSync(path.join(root, "LOGS.md"), "utf8")
      .split(/\r?\n/)
      .filter((line) => /^\| \d{4}-/.test(line));
  } catch {
    return [];
  }
}

function runLogger(root: string): void {
  execFileSync(process.execPath, [loggerPath, "--root", root, "--source", "codex"]);
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("task status log", () => {
  it("keeps native hooks pointed at the shared logger", () => {
    const claudeConfig = JSON.parse(
      readFileSync(path.join(workspaceRoot, ".claude", "settings.json"), "utf8"),
    );
    const copilotConfig = JSON.parse(
      readFileSync(path.join(workspaceRoot, ".github", "hooks", "task-status-log.json"), "utf8"),
    );
    const codexConfig = JSON.parse(
      readFileSync(path.join(workspaceRoot, ".codex", "hooks.json"), "utf8"),
    );

    expect(claudeConfig.hooks.FileChanged[0].matcher).toBe("TASKS.md");
    expect(claudeConfig.hooks.FileChanged[0].hooks[0].command).toContain(
      "scripts/log-task-status.mjs",
    );
    expect(claudeConfig.hooks.FileChanged[0].hooks[0].command).toContain("--source claude-code");
    expect(claudeConfig.hooks.PostToolUse[0].matcher).toBe("Edit|Write|MultiEdit");
    expect(claudeConfig.hooks.PostToolUse[0].hooks[0].command).toBe(
      claudeConfig.hooks.FileChanged[0].hooks[0].command,
    );
    expect(copilotConfig.hooks.postToolUse[0].command).toContain("scripts/log-task-status.mjs");
    expect(copilotConfig.hooks.postToolUse[0].command).toContain("--source github-copilot");
    expect(codexConfig.hooks.PostToolUse[0].hooks[0].command).toContain(
      "scripts/log-task-status.mjs",
    );
    expect(codexConfig.hooks.PostToolUse[0].hooks[0].command).toContain("--source codex");
  });

  it("records new tasks and later transitions once", () => {
    const root = createFixture("## T-1 Example\nStav: [ ] ready\n");

    runLogger(root);
    runLogger(root);
    let log = readFileSync(path.join(root, "LOGS.md"), "utf8");
    expect(log.match(/\| T-1 \|/g)).toHaveLength(1);
    expect(log).toContain("| new | ready | codex |");

    writeFileSync(path.join(root, "TASKS.md"), "## T-1 Example\nStav: [~] in progress\n", "utf8");
    runLogger(root);
    runLogger(root);
    log = readFileSync(path.join(root, "LOGS.md"), "utf8");

    expect(log.match(/\| T-1 \|/g)).toHaveLength(2);
    expect(log).toContain("| ready | in-progress | codex |");
  });

  it("ignores status-like text outside a task status field", () => {
    const root = createFixture(
      "Example: Stav: [x] ignored\n## T-2 Example\nCíl: [x] text\nStav: [!] blocked\n## Odloženo\nStav: [x] ignored\n",
    );

    runLogger(root);

    const log = readFileSync(path.join(root, "LOGS.md"), "utf8");
    expect(log).toContain("| T-2 | new | blocked | codex |");
    expect(log).not.toContain("T-1");
  });

  it("reads tasks under stage headings and IDs with a letter suffix", () => {
    const root = createFixture(
      [
        "# Úkoly",
        "Stav: [x] ignored",
        "## Etapa 1",
        "### T-6 Parent",
        "Stav: [x] done",
        "### T-6a Part",
        "#### Poznámky",
        "Stav: [~] in progress",
        "## Etapa 2",
        "Stav: [x] ignored",
        "### T-7 Next",
        "Stav: [ ] ready",
        "",
      ].join("\n"),
    );

    runLogger(root);

    const rows = readFileSync(path.join(root, "LOGS.md"), "utf8");
    expect(rows).toContain("| T-6 | new | done | codex |");
    expect(rows).toContain("| T-6a | new | in-progress | codex |");
    expect(rows).toContain("| T-7 | new | ready | codex |");
    expect(rows.match(/\| T-\d+[a-z]? \|/g)).toHaveLength(3);

    // Druhý běh bez změny nic nepřidá - i T-6a se pozná zpět z logu.
    writeFileSync(path.join(root, "TASKS.md"), readFileSync(path.join(root, "TASKS.md"), "utf8"), "utf8");
    runLogger(root);
    expect(readFileSync(path.join(root, "LOGS.md"), "utf8").match(/\| T-\d+[a-z]? \|/g)).toHaveLength(3);
  });

  it("rejects tasks with missing or duplicate status fields", () => {
    const missingStatusRoot = createFixture("## T-3 Missing status\nCíl: incomplete\n");
    expect(() => runLogger(missingStatusRoot)).toThrow();

    const duplicateStatusRoot = createFixture(
      "## T-4 Duplicate status\nStav: [ ] ready\nStav: [x] done\n",
    );
    expect(() => runLogger(duplicateStatusRoot)).toThrow();
  });

  describe("in a git repository", () => {
    it("logs an uncommitted transition from the committed status once", () => {
      const root = createGitFixture("## T-1 Example\nStav: [ ] ready\n");

      runLogger(root);
      expect(logRows(root)).toHaveLength(0);

      writeFileSync(path.join(root, "TASKS.md"), "## T-1 Example\nStav: [~] in progress\n", "utf8");
      runLogger(root);
      runLogger(root);

      const rows = logRows(root);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toContain("| T-1 | ready | in-progress | codex |");
    });

    it("does not log branch switches, pulls or merges as transitions", () => {
      const root = createGitFixture("## T-1 Example\nStav: [ ] ready\n");
      git(root, "switch", "-q", "-c", "task/T-1");
      commitTasks(root, "## T-1 Example\nStav: [x] done\n", "done");

      git(root, "switch", "-q", "main");
      runLogger(root);
      git(root, "switch", "-q", "task/T-1");
      runLogger(root);
      git(root, "switch", "-q", "main");
      git(root, "merge", "-q", "--ff-only", "task/T-1");
      runLogger(root);

      expect(logRows(root)).toHaveLength(0);
    });

    it("merges LOGS.md rows appended on two branches without a conflict", () => {
      const root = createGitFixture("## T-1 A\nStav: [ ] ready\n## T-2 B\nStav: [ ] ready\n");
      writeFileSync(
        path.join(root, ".gitattributes"),
        readFileSync(path.join(workspaceRoot, ".gitattributes"), "utf8"),
        "utf8",
      );
      git(root, "add", ".gitattributes");
      git(root, "commit", "-q", "-m", "attributes");
      runLogger(root);
      git(root, "add", "-A");
      git(root, "commit", "-q", "-m", "empty log");

      git(root, "switch", "-q", "-c", "task/T-1");
      writeFileSync(path.join(root, "TASKS.md"), "## T-1 A\nStav: [~] x\n## T-2 B\nStav: [ ] ready\n", "utf8");
      runLogger(root);
      git(root, "commit", "-q", "-am", "T-1");

      git(root, "switch", "-q", "main");
      git(root, "switch", "-q", "-c", "task/T-2");
      writeFileSync(path.join(root, "TASKS.md"), "## T-1 A\nStav: [ ] ready\n## T-2 B\nStav: [~] x\n", "utf8");
      runLogger(root);
      git(root, "commit", "-q", "-am", "T-2");

      git(root, "switch", "-q", "main");
      git(root, "merge", "-q", "--no-edit", "task/T-1");
      // TASKS.md se v obou větvích mění na jiném řádku, LOGS.md na stejném
      // místě - bez merge=union by tenhle merge skončil konfliktem.
      git(root, "merge", "-q", "--no-edit", "task/T-2");

      const rows = logRows(root);
      expect(rows).toHaveLength(2);
      expect(rows.join("\n")).toContain("| T-1 | ready | in-progress |");
      expect(rows.join("\n")).toContain("| T-2 | ready | in-progress |");
    });

    it("treats a task missing from the last commit as new", () => {
      const root = createGitFixture("## T-1 Example\nStav: [x] done\n");
      writeFileSync(
        path.join(root, "TASKS.md"),
        "## T-1 Example\nStav: [x] done\n## T-2 Next\nStav: [~] in progress\n",
        "utf8",
      );
      runLogger(root);

      const rows = logRows(root);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toContain("| T-2 | new | in-progress | codex |");
    });
  });
});
