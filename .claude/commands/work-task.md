---
description: Execute one planned task T-N on its own branch with real verification; routes routine work to a cheaper model
argument-hint: '[T-N]'
---

# Work task

Orchestrator step. It runs on the session model; implementation of routine
tasks is delegated by the task's `Model:` field (see `AGENTS.md`,
"Model tiers and language"). Verification and evidence are **always** done here,
never taken from the delegate's report.

## Language

Talk to the human in **Czech**. Task evidence and handover are Czech.
Working notes go to `AGENT-NOTES.md` in English. Invocation argument:
`$ARGUMENTS`.

## Load first (actually open these files)

1. `AGENTS.md` - "Risk class", "Task branch", "Consent and evidence".
2. `TASKS.md` - the task record and its `Závisí na` tasks.
3. `SPEC.md` - the referenced `AC-N`; `DECISIONS.md` - related `D-N`.
4. `PROJECT.md` - blocking `Q-N`.
5. The files the task touches (actual worktree, not memory), the relevant
   skills in `.agents/skills`, and `AGENT-NOTES.md` entries for that area.

## Select and check

Use the id from the argument; with no argument pick the only `[ ]` task whose
dependencies are `[x]`, otherwise list candidates and ask.

Stop and report if: dependencies are not done; a required decision is not
approved; the risk class is C or D and the plan is not approved; `Hotovo,
když` names no executable check; the working tree has someone else's
uncommitted changes (ask - do not carry them over).

## Execute

1. Branch: `git switch -c task/T-N-short-name` from the main branch.
2. Set `Stav: [~]` in `TASKS.md`.
3. Implement by the `Model:` field:
   - `lehky` / `stredni` and risk A/B: delegate to the `task-executor`
     subagent (Agent tool, `subagent_type: task-executor`, pass
     `model: haiku` for `lehky`, `model: sonnet` for `stredni`) using the
     handoff template below.
   - `silny`, risk C/D, or anything ambiguous: do it yourself. For C/D present
     the plan first and wait for approval.
4. Review the delegate's `git diff` line by line. Reject anything outside
   scope. Max two delegate rounds, then do it yourself or stop and report.
5. Run the checks yourself: `npx tsc --noEmit -p .`, `npx vitest run`,
   `npm run lint`, `npm run agent:skills:check` when skills changed, plus the
   live check for API/UI changes from `AGENTS.md`. Never report an unrun
   check as passed.
6. Evidence: replace the task record by the short done form
   (`Hotovo (RRRR-MM-DD): ...` what, which commands, results, **not
   verified**) and `Stav: [x]`. A requirement of human acceptance keeps it `[~]`.
7. Commit on the task branch in logical steps (`TASKS.md` together with
   `LOGS.md`). Never commit to main, never push, never merge without the
   human's explicit yes.

Handoff template for the delegate (fill every line):

```text
Goal:
Task record (T-N) and AC:
Files you may change:
Files you must not touch: TASKS.md, SPEC.md, DECISIONS.md, AGENTS.md, .claude/, tests you are not asked to change
Pattern to follow (file or skill):
Checks to run and expected result:
Stop and report when: unclear scope, 2 failed attempts, anything needing a decision
```

## Scope changes

A new requirement, a contradiction with `SPEC.md` or a needed deviation is
not solved inside the task: record `Q-N` (`PROJECT.md`) or an `IDEA-N`, keep
the task in scope, report it. Never edit `SPEC.md` to match the code.

## Notes

Append anything the next agent would otherwise rediscover (gotchas, commands
that worked, dead ends) to `AGENT-NOTES.md`, English, terse. It is not
evidence, a decision or an approval.

## Handover (Czech)

Follow "Output" in `AGENTS.md`: what changed, how it was verified (exact
commands), what is not verified, branch name and `git log --oneline`, and ask
for review. Do not start the next task.
