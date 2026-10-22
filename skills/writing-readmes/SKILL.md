---
name: writing-readmes
description: Writing a README.md - language, typography, the skeleton and its order, length limits, and what a README must never copy from other docs. Use when creating, editing, rewriting, reviewing or aligning a README, when a repo has none, or when a README looks stale.
---

# Writing a README

A README is the human front door: what the repo is, how to start it, where the rest lives. It never holds what another file already holds.

## Pick the mode

| Request | Mode |
| --- | --- |
| No README exists, or a full rewrite | **Create** |
| A fact, a command or a section changes | **Modify** |
| Bring an existing README to the standard | **Align** |

Every mode starts by reading `references/skeleton.md`.

### Create

1. Read the repo's CLAUDE.md, its manifests (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`), `.env.example`, compose files and top-level folders. Never invent a command, a path or a version.
2. Draft the common sections of the skeleton, then the sections only this repo needs.
3. Check every command and path against the repo. A step you cannot verify goes in your report, not in the README.
4. Run the checklist and fix what it finds.

### Modify

1. Change only the part the task needs, even if the rest breaks a rule; mention that in your report.
2. Apply every rule to the lines you write.
3. Run the checklist on the whole file and report problems outside your change.

### Align

1. Audit first, edit nothing: report the checklist findings and the judgement calls (duplicated content, stale facts, tone, broken links).
2. Wait for the user's go, then edit.
3. Run the checklist until nothing is left.

## Checklist

Run it after every edit, on the whole file.

- No em dash, en dash, arrow, `≥`, `≤`, `…`, typographic quotes or emoji anywhere, code blocks included.
- Exactly one H1, and every fenced block has a language.
- The skeleton's sections are present and in its order; repo-specific sections come after Documentation and before License.
- No section runs past 15 lines of prose, code blocks excluded. When one does, move the detail out instead of trimming words.

## Rules

Typography:

- A hyphen or a rephrase instead of a dash. `->`, `>=`, `|`, `...` and straight quotes instead of the symbols.
- Bold only for a blocking warning, never as a lead-in on list items.

Content:

- What and how, never why in depth: a design reason goes in an ADR or a doc, linked.
- Never copy what CLAUDE.md, a doc or an ADR says: link to it. Exception: Getting started may repeat the first-run commands, verbatim.
- No fact that goes stale: counts, inventories, exact dependency versions, thresholds. Link the source of truth. A prerequisite's minimum version is the one exception.
- No secret, token or real credential: name the variable and point to `.env.example`.
- Describe what the repo does today, never a planned feature.

Style:

- Headings in sentence case. One H1: the exact repo name.
- Commands in an `sh` block, with no `$` prompt.
- Link another repo by its full URL; a file inside the repo by relative path.
- Neutral and factual: imperative ("Run `pnpm dev`") or a plain statement. No marketing words.

## Before calling it done

1. The checklist passes.
2. Every command, path, variable and link was checked against the repo.
3. Report what you could not verify, what you moved elsewhere, and what you left non-compliant because it was outside the task.
