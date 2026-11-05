---
description: Turn an approved scope into decisions (D-N) and small tasks (T-N) with risk class and model tier
argument-hint: '[D-N of the scope approval | current]'
model: opus
allowed-tools: Read, Glob, Grep, Write, Edit
---

# Plan increment

Analysis step: run it on the strong model tier. The quality of this plan
decides whether cheaper models can safely do the routine work later.

## Language

Talk to the human in **Czech**; write project documents in Czech; IDs and
slugs ASCII. Invocation argument: `$ARGUMENTS` (the `D-N` that approved the
scope, or `current`).

## Load first (actually open these files)

1. `AGENTS.md` - "Risk class", "Model tiers and language", "Consent and evidence".
2. `PROJECT.md` - phase, active increment, blocking `Q-N`.
3. `DECISIONS.md` - the scope approval and decisions that already exist.
4. `SPEC.md` - only the `AC-N` listed in that approval.
5. `CONVENTIONS.md` and the skills relevant to the touched areas
   (`.agents/skills/*`), so tasks name the right patterns.

## Preconditions (check, do not assume)

- A `D-N` with a filled `Schválení:` for exactly this scope exists.
- No open `Q-N` that blocks those `AC-N`.

If one fails: list the missing items as questions and stop with a pointer to
`/discover-project`. Do not plan around gaps.

## Part A - Decisions

Only decisions this increment really needs (data model, new dependency,
integration, security boundary). Compare 2-3 options, give trade-offs and a
recommendation. Write them as `D-N` with `Schválení:` left **empty** and say
"čeká na schválení". Class C/D decisions (new dependency, authorization,
migration, public API shape, `.env`/OAuth) always wait for the human. Stop and
ask before Part B if any decision is unapproved.

## Part B - Tasks

Write `T-N` records in `TASKS.md` in the project's format, exactly:

```markdown
## T-N
- nazev: short human name
Cíl: observable result.
Splňuje: AC-N
Závisí na: T-M | –
Riziko: A | B | C | D
Model: lehky | stredni | silny
Hotovo, když: concrete conditions, including the exact commands that must pass.
Stav: [ ]
```

Rules:

- One task = one reviewable change, one branch, checks that can disprove it.
- `Model:` default from risk: A -> `lehky`, B -> `stredni`, C and D ->
  `silny`. Raise it freely; lower it only with a reason in the task.
- A task that a cheaper model will do must be self-contained: name the files,
  the pattern to copy (existing file or skill), what is out of scope and the
  check that proves it. If you cannot write that, the task is too big or too
  vague - split it or keep `Model: silny`.
- Every `AC-N` of the increment is covered by at least one task; report gaps
  instead of inventing criteria.
- Do not mark tasks done, do not implement.

## Handover (Czech)

- Decisions: approved vs. waiting.
- Tasks with risk, model tier and dependency order; AC coverage table.
- First task to run: `/work-task T-N`.
