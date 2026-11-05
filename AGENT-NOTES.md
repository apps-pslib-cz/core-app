# Agent working notes

Notes written by agents for the next agent (any tool). Purpose: save
rediscovery - gotchas, commands that worked, dead ends, where things really
are. English on purpose (shorter, cheaper to load); the human-facing record
stays Czech in `TASKS.md`, `DECISIONS.md` and the handover.

Rules:

- Append-only: add a new entry at the end; never rewrite another entry
  (`.gitattributes` merges this file with `merge=union`, so parallel branches
  do not conflict).
- Entry = heading `## YYYY-MM-DD T-N <tool>` + at most 5 terse bullets.
  Facts only, each checkable in the repo or by a command. No opinions, no
  plans, no chat.
- This file is **not** evidence, a decision, an approval or a requirement.
  Anything durable and binding belongs in `CONVENTIONS.md`, a skill or
  `DECISIONS.md` (Czech) - promote it there in a task and say so in the entry.
- Never store prompts, transcripts, credentials, personal data or tool output.
- Read it when a task touches the same area: `grep -n -i <topic>
  AGENT-NOTES.md`; do not load the whole file once it grows past ~150 lines.
- Pruning (removing stale or promoted entries) is a dedicated task on a
  branch from the main branch, never a side effect of other work.

## 2026-11-05 T-5 claude-code
- Working tree had someone else's uncommitted changes while a new task branch
  was needed: `git clone <repo> <scratch>`, branch and commit there, then
  `git fetch <scratch> task/T-N-name:task/T-N-name` in the real repo. The
  working tree and its uncommitted changes stay untouched.
- `npm ci` fails with npm 10 (S-36 in `SISTER-REPOS.md`); `npm install` works.
- `model:` in command and agent frontmatter takes `opus`, `sonnet`, `haiku`;
  the Agent tool call can override the model per call.
