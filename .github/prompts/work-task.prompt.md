---
description: 'Execute one planned task T-N on its own branch with real verification; routes routine work to a cheaper model'
agent: agent
argument-hint: '[T-N]'
tools: ['read', 'edit', 'search', 'execute', 'agent']
---

# Work task

This is the Copilot entry point of a shared workflow. The workflow itself
lives in `.claude/commands/work-task.md` (single source, not copied here): open
that file and follow it from its first heading on. Ignore its frontmatter.

Mapping for this tool:

- The argument (`$ARGUMENTS` in the workflow) is whatever the human typed
  after the command.
- Model tier: the session model orchestrates; implementation follows the
  task's `Model:` field (see below). The human chooses the model in the
  picker; this file does not pin a model id because ids differ by plan and
  change.
- Delegation: where the workflow says to use the Agent tool with
  `subagent_type: task-executor`, call `runSubagent` with the custom agent
  `task-executor` (VS Code also reads `.claude/agents/`). If the tool accepts a
  model parameter, pass a light model for `lehky` and a medium one for
  `stredni`. If subagents are unavailable, do the work yourself and say so in
  the handover.
- Checks and git are run in the terminal; the safeguards of `AGENTS.md`
  ("Omezení") apply, because Copilot has no enforced permissions here.
