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

  it("rejects tasks with missing or duplicate status fields", () => {
    const missingStatusRoot = createFixture("## T-3 Missing status\nCíl: incomplete\n");
    expect(() => runLogger(missingStatusRoot)).toThrow();

    const duplicateStatusRoot = createFixture(
      "## T-4 Duplicate status\nStav: [ ] ready\nStav: [x] done\n",
    );
    expect(() => runLogger(duplicateStatusRoot)).toThrow();
  });
});