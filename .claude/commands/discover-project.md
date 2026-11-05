---
description: Start or resume product discovery for an app built on this template (writes SPEC.md, PROJECT.md; no code)
argument-hint: '[known facts about the product | continue]'
model: opus
allowed-tools: Read, Glob, Grep, Write, Edit
---

# Discover project

Analysis step: run it on the strong model tier (see `AGENTS.md`, "Model tiers and language").

## Language

Talk to the human in **Czech**. Write project documents in Czech. Keep IDs
and state slugs ASCII. Invocation argument: `$ARGUMENTS`.

## Load first (actually open these files)

1. `AGENTS.md` - especially "Consent and evidence" and "Risk class".
2. `PROJECT.md` - phase and open questions `Q-N`.
3. `SPEC.md` - existing purpose, scenarios, data, acceptance criteria `AC-N`.
4. `DECISIONS.md` and `IDEAS.md` - what is already decided or proposed.

If `PROJECT.md` has phase `priprava`, set it to `discovery` and put today's
date in `Od` (this command is the explicit human start).
If `PROJECT.md` is missing, stop and tell the human (template was not copied
completely).

## What is given by the template

The stack is **not** an open question: Next.js App Router, Prisma/PostgreSQL,
Mantine, NextAuth with the school OAuth server, roles as `string[]`. Treat it
as a constraint; do not reopen it. Discovery concerns the *application*: its
users, scenarios, data, rules and acceptance criteria.

## Allowed work

- Conversation: one important question at a time, need before technology,
  a short summary of your understanding every few answers.
- Writing **only what the human actually said** into `SPEC.md` (purpose,
  users and scenarios, data, rules and error states, `- [ ] AC-N:` criteria,
  out of scope). Mark anything you proposed yourself as "návrh agenta".
- Unknowns and contradictions go to `PROJECT.md` as `Q-N`; ideas that are
  not requirements go to `IDEAS.md` (state `nový`).
- Options with consequences and a recommendation when the human says "nevím"
  or "doporuč" - label the recommendation as an agent proposal.

## Not allowed

- Creating tasks (`TASKS.md`) or designing the solution - that is
  `/plan-increment` after approval.
- Inventing numbers, users or requirements; filling gaps by guessing.
- Writing an approval (`Schválení:` in `DECISIONS.md`) before the human has
  said so in this conversation. Silence, a green check or a long chat is not
  consent.
- Resolving a contradiction silently - record it as `Q-N` and ask.
- Editing code, installing, running, committing.

## Stop points

1. A coherent first-increment scope exists: list the exact `AC-N` ids and ask
   for approval of **exactly that list**. On an explicit yes, add a
   `D-N` ("Schválení rozsahu přírůstku") naming the list, the revision of
   `SPEC.md` it refers to (commit or "ve znění k RRRR-MM-DD") and the date;
   set `PROJECT.md` phase to `navrh` and fill "Aktivní přírůstek".
2. A blocking unknown needs a human decision.
3. The human pauses: leave `PROJECT.md` consistent (phase, open `Q-N`).

## Handover (Czech, short)

- Summary of understanding (3-8 bullets).
- Ids written, grouped by file.
- Open questions: blocking vs. not blocking.
- The explicit question: approve scope `[AC-N, ...]` or continue?
- After approval: next step `/plan-increment`.
