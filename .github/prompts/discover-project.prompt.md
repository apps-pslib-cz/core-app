---
description: 'Start or resume product discovery for an app built on this template (writes SPEC.md, PROJECT.md; no code)'
agent: agent
argument-hint: '[known facts about the product | continue]'
tools: ['read', 'edit', 'search']
---

# Discover project

This is the Copilot entry point of a shared workflow. The workflow itself
lives in `.claude/commands/discover-project.md` (single source, not copied here): open
that file and follow it from its first heading on. Ignore its frontmatter.

Mapping for this tool:

- The argument (`$ARGUMENTS` in the workflow) is whatever the human typed
  after the command.
- Model tier: strong. If the human did not select a strong model, remind
  them in one line, then continue. The human chooses the model in the
  picker; this file does not pin a model id because ids differ by plan and
  change.
- No terminal: the workflow has no shell step. Do not run commands.
