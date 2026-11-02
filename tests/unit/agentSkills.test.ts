import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const syncScriptPath = path.join(workspaceRoot, "scripts", "sync-agent-skills.mjs");
const temporaryRoots: string[] = [];

function runSync(root: string, mode: "--sync" | "--check"): void {
  execFileSync(process.execPath, [syncScriptPath, "--root", root, mode]);
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("shared agent skills", () => {
  it("keeps canonical skills and Claude mirrors synchronized", () => {
    expect(() => runSync(workspaceRoot, "--check")).not.toThrow();
  });

  it("repairs a stale mirror and rejects malformed canonical metadata", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "agent-skills-"));
    temporaryRoots.push(root);
    const canonicalDirectory = path.join(root, ".agents", "skills", "sample-skill");
    const mirrorDirectory = path.join(root, ".claude", "skills", "sample-skill");
    mkdirSync(canonicalDirectory, { recursive: true });
    mkdirSync(mirrorDirectory, { recursive: true });
    const canonicalContent = "---\nname: sample-skill\ndescription: Sample workflow.\n---\n\nInstructions.\n";
    writeFileSync(path.join(canonicalDirectory, "SKILL.md"), canonicalContent, "utf8");
    writeFileSync(path.join(mirrorDirectory, "SKILL.md"), "stale", "utf8");

    expect(() => runSync(root, "--check")).toThrow();
    runSync(root, "--sync");
    expect(readFileSync(path.join(mirrorDirectory, "SKILL.md"), "utf8")).toBe(canonicalContent);

    writeFileSync(
      path.join(canonicalDirectory, "SKILL.md"),
      canonicalContent.replace("name: sample-skill", "name: wrong-name"),
      "utf8",
    );
    expect(() => runSync(root, "--sync")).toThrow();
  });
});