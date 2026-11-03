---
name: agentic-engineering
description: "Use for non-trivial project changes, idea triage, requirements, task planning, decisions, evidence, and handoffs across Claude Code, GitHub Copilot, and Codex."
---

# Traceable Project Work

Use this workflow for non-trivial work in this parent project and projects built from it. It is tool-neutral; follow the repository's own domain rules and formats rather than importing another project's domain-specific steps.

## Before implementation

1. Read `AGENTS.md`, `SPEC.md`, the relevant `TASKS.md` entry, and related `DECISIONS.md` records. Read `CONVENTIONS.md` and applicable skills as needed.
2. Separate the requested outcome from assumptions, out-of-scope work, approval state, and open questions.
3. If the idea is not yet approved or has no clear acceptance criteria, record and analyze it; do not treat analysis or silence as implementation approval.
4. For a non-trivial change, present the affected files, approach, risks, checks, and cheapest falsifiable check before editing. Classify the risk (class A-D, see the "Třída rizika" section of `AGENTS.md`) and record it as `Riziko` in the task; for class C or D wait for approval of the plan before any edit.
5. Implement only the approved scope. Request approval before adding dependencies, changing data models, or changing architecture.

## Task branch

1. When working on a task on your own, start from a clean working tree on the current main branch (`main`/`master`) and create `task/T-N-short-name`. Do not carry over someone else's uncommitted changes; ask instead.
2. Commit to the task branch in logical steps; commit `LOGS.md` together with `TASKS.md`. Never commit directly to the main branch.
3. After checks pass and `TASKS.md` holds the evidence, hand off: summary, branch name, `git log --oneline <main>..HEAD`, and a request for review.
4. Merge into the main branch only after the user explicitly approves (`git merge --no-ff`), rerun the checks, then delete the branch. Without approval, ask the user and give the exact commands. Never push or rewrite history without explicit permission.

## Project memory

- `IDEAS.md` stores stable idea IDs with `Nazev`, `Navrh`, `Stav`, and `Vazby`. Preserve deferred and rejected ideas.
- `TASKS.md` is the source of current task status, work notes, and verification evidence. Keep idea/task links bidirectional.
- `DECISIONS.md` records approved choices with rationale, consequences, date, and actual approver.
- `LOGS.md` is generated from observed task-status transitions. Never edit it manually; it is not approval or evidence.
- Do not store prompts, transcripts, credentials, personal data, or tool output in the task-status log.

## Verification and handoff

1. After the first edit, run the narrowest check that can disprove the current hypothesis before making more changes.
2. Verify each acceptance criterion with an automated check, reproducible manual scenario, or explicit statement that it remains unverified.
3. Do not report a criterion as met based only on documentation edits or a successful typecheck when behavior was not exercised.
4. Update the actual task state and its evidence. Keep generated logs separate from human decisions and test results.
5. At handoff, list changed files, criteria with evidence, checks actually run, remaining risks, and the next useful step.

## Tool compatibility

`AGENTS.md` is the shared instruction source. Skills live canonically under `.agents/skills`; Claude Code's `.claude/skills` directory is a generated mirror. After changing a canonical skill, run `npm run agent:skills:sync`, then verify with `npm run agent:skills:check`.