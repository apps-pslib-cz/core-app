import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readProjectFile(relativePath: string): string {
  // Na Windows s core.autocrlf=true má checkout CRLF - regulární výrazy
  // níž počítají s \n.
  return readFileSync(path.join(workspaceRoot, relativePath), "utf8").replace(/\r\n/g, "\n");
}

describe("agent workflow documentation", () => {
  it("keeps idea IDs unique, structured, and linked to existing tasks once in work", () => {
    const ideas = readProjectFile("IDEAS.md");
    const tasks = readProjectFile("TASKS.md");
    const ideaIds = [...ideas.matchAll(/^## (IDEA-\d+)$/gm)].map((match) => match[1]);

    expect(new Set(ideaIds).size).toBe(ideaIds.length);
    expect(ideaIds).not.toHaveLength(0);

    for (const ideaId of ideaIds) {
      const start = ideas.indexOf(`## ${ideaId}`);
      const nextHeading = ideas.indexOf("\n## ", start + 1);
      const idea = ideas.slice(start, nextHeading < 0 ? undefined : nextHeading);
      const fields = [...idea.matchAll(/^- ([A-Za-z]+):/gm)].map((match) => match[1]);
      const linkedTask = /^- Vazby: \[(T-\d+)\]\(TASKS\.md#t-\d+\)$/m.exec(idea)?.[1];
      const state = /^- Stav: (.+)$/m.exec(idea)?.[1].trim();

      expect(fields).toEqual(["Nazev", "Navrh", "Stav", "Vazby"]);
      // Nový, odložený nebo zamítnutý nápad úkol mít nemusí - zachovává se
      // i bez něj. Rozpracovaný a hotový musí odkazovat na existující úkol.
      if (state === "rozpracováno" || state === "hotovo") {
        expect(linkedTask, `${ideaId} (${state}) bez úkolu`).toBeTruthy();
      }
      if (linkedTask) {
        expect(tasks).toContain(`## ${linkedTask}`);
        expect(tasks).toContain(ideaId);
      }
    }
  });

  it("keeps task IDs and acceptance criterion IDs unique with explicit task names", () => {
    const tasks = readProjectFile("TASKS.md");
    const specification = readProjectFile("SPEC.md");
    const taskIds = [...tasks.matchAll(/^## (T-\d+)$/gm)].map((match) => match[1]);
    const criterionIds = [...specification.matchAll(/\b(AC-\d+):/g)].map((match) => match[1]);

    expect(new Set(taskIds).size).toBe(taskIds.length);
    expect(new Set(criterionIds).size).toBe(criterionIds.length);
    expect(taskIds).not.toHaveLength(0);

    for (const taskId of taskIds) {
      const start = tasks.indexOf(`## ${taskId}`);
      const nextHeading = tasks.indexOf("\n## ", start + 1);
      const task = tasks.slice(start, nextHeading < 0 ? undefined : nextHeading);
      expect(task).toMatch(/^Stav: \[[ ~!x]\]/m);
      if (/^Stav: \[x\]/m.test(task)) {
        expect(task).toMatch(/^## T-\d+\nHotovo \(\d{4}-\d{2}-\d{2}\): .+/);
      } else {
        expect(task).toMatch(/^## T-\d+\n- nazev: .+/);
      }
    }
  });

  it("names derived repositories only in SISTER-REPOS.md and task records", () => {
    const registry = readProjectFile("SISTER-REPOS.md");
    const derived = [...registry.matchAll(/^\| `\.\.\/([a-z0-9-]+)` \|/gm)].map((m) => m[1]);
    expect(derived.length).toBeGreaterThan(0);

    // Šablona je odrazový můstek: živé dokumenty, skills a kód nemají
    // odkazovat na konkrétní appky. Výjimkou je registr samotný a záznamy
    // úkolů/nápadů/logu, které popisují práci s nimi.
    const allowed = new Set(["SISTER-REPOS.md", "TASKS.md", "IDEAS.md", "LOGS.md"]);
    const roots = [".", "dev_notes", "docs", ".agents", ".claude", "src", "scripts", "tests", "tools"];
    const skip = /(^|\/)(node_modules|generated|\.next)(\/|$)/;
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(path.join(workspaceRoot, dir), { withFileTypes: true })) {
        const rel = dir === "." ? entry.name : `${dir}/${entry.name}`;
        if (skip.test(rel)) continue;
        if (entry.isDirectory()) {
          if (dir !== ".") walk(rel);
        } else if (/\.(md|ts|tsx|mjs|sql|json|xml|ps1)$/.test(entry.name)) {
          files.push(rel);
        }
      }
    };
    roots.forEach(walk);

    const self = "tests/unit/agentDocs.test.ts";
    const offenders = files
      .filter((file) => !allowed.has(file) && file !== self && file !== "package-lock.json")
      .flatMap((file) => {
        const content = readProjectFile(file);
        return derived.filter((name) => content.includes(name)).map((name) => `${file}: ${name}`);
      });
    expect(offenders).toEqual([]);
  });
});
