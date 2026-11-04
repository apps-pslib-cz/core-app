import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const guardPath = path.join(workspaceRoot, "scripts", "guard-main-branch.mjs");
const temporaryRoots: string[] = [];

function git(root: string, ...args: string[]): void {
  execFileSync(
    "git",
    ["-C", root, "-c", "user.name=test", "-c", "user.email=test@example.invalid", ...args],
    { stdio: "ignore" },
  );
}

/** Repozitář s jedním commitem na dané větvi. */
function createRepository(branch: string): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "guard-main-"));
  temporaryRoots.push(root);
  git(root, "init", "-q", "-b", branch);
  writeFileSync(path.join(root, "file.txt"), "x", "utf8");
  git(root, "add", "file.txt");
  git(root, "commit", "-q", "-m", "init");
  return root;
}

function runGuard(payload: unknown): { status: number | null; stderr: string } {
  const result = spawnSync(process.execPath, [guardPath], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    encoding: "utf8",
  });
  return { status: result.status, stderr: result.stderr };
}

function bash(cwd: string, command: string) {
  return { tool_name: "Bash", tool_input: { command }, cwd };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("guard-main-branch hook", () => {
  it("blocks git commit on main and master with exit code 2", () => {
    for (const branch of ["main", "master"]) {
      const root = createRepository(branch);
      const result = runGuard(bash(root, 'git commit -m "feat: x"'));
      expect(result.status, branch).toBe(2);
      expect(result.stderr).toContain(branch);
      expect(result.stderr).toContain("task/T-N");
    }
  });

  it("blocks commits hidden behind git options, environment variables and chains", () => {
    const root = createRepository("main");
    for (const command of [
      "git -c user.name=x commit -m y",
      "git -C . commit --amend",
      "GIT_AUTHOR_NAME=x git commit -m y",
      "git add -A && git commit -m y",
      "git add -A; git commit -m y",
    ]) {
      expect(runGuard(bash(root, command)).status, command).toBe(2);
    }
  });

  it("allows commits on a task branch", () => {
    const root = createRepository("task/T-9-example");
    expect(runGuard(bash(root, 'git commit -m "feat: x"')).status).toBe(0);
  });

  it("allows creating a task branch and committing in one command", () => {
    const root = createRepository("main");
    expect(
      runGuard(bash(root, 'git switch -c task/T-9-example && git commit -m "feat: x"')).status,
    ).toBe(0);
    expect(
      runGuard(bash(root, 'git checkout -b task/T-9-example && git commit -m "feat: x"')).status,
    ).toBe(0);
    // Větev vznikla až PO commitu - commit stále míří na main.
    expect(
      runGuard(bash(root, 'git commit -m "feat: x" && git switch -c task/T-9-example')).status,
    ).toBe(2);
  });

  it("does not interfere with other git commands or other tools", () => {
    const root = createRepository("main");
    for (const command of [
      "git status",
      "git log --grep=commit",
      "git diff --stat",
      'echo "git commit"',
      "git switch -c task/T-9-example",
      "npm run lint",
    ]) {
      expect(runGuard(bash(root, command)).status, command).toBe(0);
    }
    expect(runGuard({ tool_name: "Edit", tool_input: { file_path: "a.ts" }, cwd: root }).status).toBe(0);
  });

  it("fails open on invalid input, missing repository and detached HEAD", () => {
    expect(runGuard("not json").status).toBe(0);
    expect(runGuard({}).status).toBe(0);

    const notARepository = mkdtempSync(path.join(os.tmpdir(), "guard-main-nogit-"));
    temporaryRoots.push(notARepository);
    expect(runGuard(bash(notARepository, "git commit -m x")).status).toBe(0);

    const detached = createRepository("main");
    git(detached, "checkout", "-q", "--detach");
    expect(runGuard(bash(detached, "git commit -m x")).status).toBe(0);
  });
});
