import { existsSync, readFileSync, readdirSync } from "node:fs";
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

  it("keeps the risk classes in the always-loaded AGENTS.md and in the canonical skill", () => {
    const agents = readProjectFile("AGENTS.md");
    const skill = readProjectFile(".agents/skills/agentic-engineering/SKILL.md");
    const section = /^## Risk class\n([\s\S]*?)(?=^## )/m.exec(agents)?.[1] ?? "";

    for (const riskClass of ["A", "B", "C", "D"]) {
      expect(section, `třída ${riskClass}`).toContain(`- **${riskClass}** (`);
    }
    expect(skill).toContain("Risk class");
  });
});

describe("entry commands, model tiers and agent notes (D-13)", () => {
  const MODELS = ["opus", "sonnet", "haiku"];
  const frontmatter = (text: string): Record<string, string> => {
    const block = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? "";
    return Object.fromEntries(
      [...block.matchAll(/^([a-z-]+):\s*(.*)$/gm)].map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")]),
    );
  };

  it("ships the three entry commands with a description and a valid model", () => {
    for (const name of ["discover-project", "plan-increment", "work-task"]) {
      const file = `.claude/commands/${name}.md`;
      expect(existsSync(path.join(workspaceRoot, file)), file).toBe(true);
      const meta = frontmatter(readProjectFile(file));
      expect(meta.description, `${name}: description`).toBeTruthy();
      if (meta.model) expect(MODELS, `${name}: model`).toContain(meta.model);
    }
    // Analýza a plán jsou na silném modelu; work-task model neurčuje (řídí ho pole Model: úkolu).
    expect(frontmatter(readProjectFile(".claude/commands/discover-project.md")).model).toBe("opus");
    expect(frontmatter(readProjectFile(".claude/commands/plan-increment.md")).model).toBe("opus");
    expect(frontmatter(readProjectFile(".claude/commands/work-task.md")).model).toBeUndefined();
  });

  it("only references existing agent files and AGENTS.md sections", () => {
    const agents = readProjectFile("AGENTS.md");
    const texts = ["discover-project", "plan-increment", "work-task"].map((n) =>
      readProjectFile(`.claude/commands/${n}.md`),
    );
    for (const text of texts) {
      for (const ref of text.matchAll(/`((?:\.claude|\.agents)\/[^`*]+\.md)`/g)) {
        expect(existsSync(path.join(workspaceRoot, ref[1])), ref[1]).toBe(true);
      }
    }
    // Delegát z /work-task musí být skutečný subagent.
    const delegates = [...texts.join("\n").matchAll(/subagent_type: ([a-z-]+)/g)].map((m) => m[1]);
    expect(delegates).toContain("task-executor");
    for (const name of delegates) {
      expect(existsSync(path.join(workspaceRoot, `.claude/agents/${name}.md`)), name).toBe(true);
    }
    for (const section of ["Risk class", "Task branch", "Consent and evidence", "Model tiers and language", "Output"]) {
      expect(agents, section).toContain(`\n## ${section}\n`);
    }
  });

  it("keeps the executor subagent narrow and its report a claim, not evidence", () => {
    const text = readProjectFile(".claude/agents/task-executor.md");
    const meta = frontmatter(text);
    expect(meta.name).toBe("task-executor");
    expect(MODELS).toContain(meta.model);
    const tools = meta.tools.split(",").map((t) => t.trim());
    expect(tools).toContain("Bash");
    expect(tools).not.toContain("Agent");
    for (const forbidden of ["TASKS.md", "SPEC.md", "DECISIONS.md", "git commit", "git push"]) {
      expect(text, forbidden).toContain(forbidden);
    }
    expect(text).toContain("claim, not evidence");
  });

  it("documents consent, evidence states, model tiers and stays short in AGENTS.md", () => {
    const agents = readProjectFile("AGENTS.md");
    for (const phrase of ["**Implemented**", "**verified**", "**accepted**"]) {
      expect(agents, phrase).toContain(phrase);
    }
    expect(agents.replace(/\s+/g, " ")).toContain("never edit `SPEC.md` to match the implementation");
    for (const tier of ["silny", "stredni", "lehky", "opus", "sonnet", "haiku"]) {
      expect(agents, tier).toContain(`\`${tier}\``);
    }
    // Metodika (příloha A): kořenový instrukční soubor cílit pod 200 řádků.
    expect(agents.split("\n").length).toBeLessThan(200);

    const project = readProjectFile("PROJECT.md");
    for (const heading of ["## Fáze", "## Aktivní přírůstek", "## Otevřené otázky"]) {
      expect(project, heading).toContain(heading);
    }
    for (const model of readProjectFile("TASKS.md").matchAll(/^Model: (.+)$/gm)) {
      expect(["silny", "stredni", "lehky"], `Model: ${model[1]}`).toContain(model[1].trim());
    }
  });

  it("offers the same workflows to Copilot as thin prompt wrappers (D-14)", () => {
    const names = ["discover-project", "plan-increment", "work-task"];
    for (const name of names) {
      const claude = readProjectFile(`.claude/commands/${name}.md`);
      const file = `.github/prompts/${name}.prompt.md`;
      expect(existsSync(path.join(workspaceRoot, file)), file).toBe(true);
      const prompt = readProjectFile(file);
      const meta = frontmatter(prompt);
      expect(meta.description, `${name}: description`).toBe(frontmatter(claude).description);
      expect(meta.agent).toBe("agent");
      // Tenký obal: odkazuje na jediný zdroj postupu, nekopíruje ho.
      expect(prompt).toContain(`.claude/commands/${name}.md`);
      expect(prompt.split("\n").length, `${name}: wrapper too long`).toBeLessThan(40);
      const tools = meta.tools.replace(/[\[\]'" ]/g, "").split(",");
      if (name === "work-task") {
        expect(tools).toEqual(expect.arrayContaining(["agent", "execute", "edit"]));
        expect(prompt).toContain("runSubagent");
      } else {
        // Analytické postupy nemají shell (stejně jako allowed-tools u Claude příkazu).
        expect(tools).not.toContain("execute");
        expect(tools).not.toContain("agent");
      }
    }
  });

  it("keeps AGENTS.md in English outside code spans, quotes and Czech labels (D-15)", () => {
    const agents = readProjectFile("AGENTS.md");
    const prose = agents
      .slice(agents.indexOf("# core-app"))
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]*`/g, "")
      .replace(/"[^"]*"/g, "")
      .replace(/\*\*[^*]*\*\*/g, "")
      .replace(/SPŠSE a VOŠ Liberec/g, "");
    expect(prose.match(/[ěščřžýáíéůúťďňĚŠČŘŽÝÁÍÉŮÚŤĎŇ]/g) ?? []).toEqual([]);
  });

  it("leaves no reference to the retired Czech AGENTS.md section names (D-15)", () => {
    const retired = [
      "Spolupráce agentů", "Postup práce", "Třída rizika", "Práce ve větvi úkolu", "Vstupní postupy",
      "Souhlas a důkaz", "Úrovně modelů a jazyk", "Odvozené repozitáře", "Omezení", "Výstup",
    ];
    const files = [
      ...["discover-project", "plan-increment", "work-task"].flatMap((n) => [
        `.claude/commands/${n}.md`,
        `.github/prompts/${n}.prompt.md`,
      ]),
      ".claude/agents/task-executor.md",
      ".agents/skills/agentic-engineering/SKILL.md",
      "scripts/guard-main-branch.mjs",
    ];
    const offenders = files.flatMap((file) =>
      retired.filter((name) => readProjectFile(file).includes(`"${name}"`)).map((name) => `${file}: ${name}`),
    );
    expect(offenders).toEqual([]);
  });

  it("keeps AGENT-NOTES.md append-only (merge=union) with well-formed entries", () => {
    const notes = readProjectFile("AGENT-NOTES.md");
    expect(notes.startsWith("# Agent working notes")).toBe(true);
    const headings = [...notes.matchAll(/^## .*$/gm)].map((m) => m[0]);
    expect(headings).not.toHaveLength(0);
    for (const heading of headings) {
      expect(heading).toMatch(/^## \d{4}-\d{2}-\d{2} T-\d+ [a-z-]+$/);
    }
    expect(readProjectFile(".gitattributes")).toMatch(/^AGENT-NOTES\.md merge=union$/m);
  });
});
