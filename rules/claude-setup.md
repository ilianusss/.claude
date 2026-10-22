---
paths:
  - "**/skills/**/*.md"
  - "**/agents/*.md"
  - "**/rules/*.md"
  - "**/mods/**"
  - "**/CLAUDE.md"
  - "settings.json"
  - "**/.claude/settings*.json"
  - "**/.claude/workflow.json"
---

# Claude Code setup files

Load the `editing-claude-setup` skill before changing any of these files.

House style:

- Skill names are gerunds (`writing-readmes`). The description starts with what the skill covers and the phrases that should trigger it, in under ~400 characters.
- Explain why a rule exists instead of writing it in capitals.
- References sit one level deep, linked from the skill's body.
- A global skill stays generic; a project adds an overlay skill in its own `.claude/skills/`.
- No em dash.
