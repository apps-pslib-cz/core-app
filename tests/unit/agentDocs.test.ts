import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(workspaceRoot, relativePath), "utf8");
}

describe("agent workflow documentation", () => {
  it("keeps idea IDs unique, structured, and linked to existing tasks", () => {
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

      expect(fields).toEqual(["Nazev", "Navrh", "Stav", "Vazby"]);
      expect(linkedTask).toBeTruthy();
      expect(tasks).toContain(`## ${linkedTask}`);
      expect(tasks).toContain(ideaId);
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
});