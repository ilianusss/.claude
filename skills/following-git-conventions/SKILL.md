---
name: following-git-conventions
description: Git conventions for any repo - the eleven commit keywords, branch names, commit header and body, breaking changes, reverting, pull request size, title, body, checks, reviewers and stacking. Use when naming a branch, writing or amending a commit, choosing between feat, fix, chore or refactor, reverting, opening or describing a pull request, or judging whether a change is too big for one.
---

# Following git conventions

Never create a branch, commit, push or open a pull request unless the user asks (a workflow started with commits enabled counts as asking for its slice commits). When they do, apply every rule below. A project's CLAUDE.md overrides these where it says so.

## Keywords

The same eleven keywords name branches, commits and pull requests. Pick the one that describes the main effect.

| Keyword | Use it for | Example |
| --- | --- | --- |
| `feat` | New behaviour a user or a consumer can see: a route, a screen, a component, a CLI flag, a new skill or rule | `feat(auth): add refresh token rotation` |
| `fix` | Behaviour that was wrong and is now right | `fix(cart): keep the total when an item is removed` |
| `docs` | Documentation only: README, CLAUDE.md wording, ADR | `docs: explain the release process` |
| `chore` | Maintenance touching neither shipped code nor the build: `.gitignore`, editor and tool setup, git hooks | `chore: ignore coverage output` |
| `style` | Formatting only, what a formatter could produce. Never a visual change | `style(api): apply prettier` |
| `refactor` | Restructured with no behaviour change; existing tests pass unchanged | `refactor(ingest): extract the chunk writer` |
| `perf` | Faster or lighter, same behaviour; the body gives the measurement | `perf(search): batch the reranker calls` |
| `test` | Tests only: a missing test, a flaky one fixed, test tooling | `test(auth): cover the replayed refresh token` |
| `build` | Dependencies, lockfiles, Dockerfile, compose, manifests, bundler config, a version bump | `build: bump vite to 6.2` |
| `ci` | `.github/workflows/` and anything only CI runs | `ci: cache the pnpm store` |
| `revert` | Undoing an earlier commit | `revert(auth): block the 6th login attempt` |

Pitfalls:

- A CSS or layout change is `feat` or `fix`, never `style`.
- Tests written with the code they cover ship in the same `feat` or `fix` commit. `test` is for a commit that changes tests alone.
- A `refactor` that needs a test changed is a behaviour change: make it `feat` or `fix`, or split it.
- Two keywords fit one diff: split it into two commits.
- In a Claude Code setup repo: a new skill, agent, rule, mod or instruction is `feat`, correcting wrong content is `fix`, rewording is `docs`, settings plumbing and marketplaces are `chore`.

## Branches

Format `<keyword>/<branch-name>`, for example `feat/refresh-token-rotation`.

- Lowercase ASCII letters, digits and hyphens, two to five words. No second slash, no username.
- Branch from an up-to-date default branch. Never commit to the default branch directly, unless the project CLAUDE.md says the repo takes direct commits.
- Never rename a branch once pushed.

## Commit header

Format `<keyword>(<scope>): <summary>`.

- **Scope:** the name the code already uses for the area (a module, a package, a feature folder), lowercase kebab-case, one scope. Drop the parentheses when the change has no single area.
- **Summary:** imperative mood ("add", not "added"), starts lowercase unless it starts with an identifier, no trailing period, says what changes for the reader rather than which file was edited.
- The whole header fits in 72 characters. No emoji, no em or en dash.
- **Issue reference:** when the project tracks work in issues, end the header with the id in parentheses (`(#42)`) or put `Refs: #42` in the footer, as the project CLAUDE.md says. Never invent one.
- **Breaking change:** `!` before the colon when a consumer must change (a route, payload or error shape, a removed export, a newly required environment variable), and a `BREAKING CHANGE:` footer saying what breaks and what the consumer does.

## Commit body

- Optional when the header says it all. Required when the reason is not obvious from the diff, for `perf` (the measurement) and for `revert` (why).
- A blank line after the header, lines wrapped at 72 characters.
- Explains why and what was ruled out, not a list of edited files.
- Footers last, one per line. Never a `Co-Authored-By` trailer for Claude.

One commit is one logical change that builds and passes its tests on its own. Squash fixups into the commit they fix before review.

## Reverting

Run `git revert <sha>`, then rewrite the generated message (`Revert "..."`) into the convention: the original scope and summary, and why in the body.

## Pull requests

Before opening one:

1. Rebase on an up-to-date default branch and squash fixups.
2. Run the checks CI runs (the project CLAUDE.md lists them) and fix every failure.
3. Push with `git push -u origin <branch>` and open it with `gh pr create --assignee @me`, as a `--draft` while it is not ready.

Title: the commit header format with the branch's keyword. Body, in this order:

```markdown
## What

One or two sentences on the change and why, with the issue reference if any.

- One bullet per notable change, in the reader's terms.
- What was deliberately left out, and why.

## Linked PR

(Only when there is one) URL and merge order.

## Test

- Commands run and their result.
- The manual check: where to start, what to do, what to see.
- Not verified: what you could not check, and why.
```

One concern per pull request. An unrelated fix found on the way goes in its own branch, or is mentioned in the body.

### Size

One pull request is one outcome a reviewer can hold in their head in one sitting. Roughly 500 changed lines or 10 files, not counting lockfiles, generated files and fixtures, is where a diff stops being that. A migration, a generated client or a formatter sweep legitimately goes past it; `## What` then says what the reviewer can skim.

Past the signal without such a reason, stop and ask the user whether to split. When they say yes, split into parts that are each verifiable on their own, in merge order, the contract first (`writing-github-issues`, Scope of one issue). Parts that build on each other ship as stacked pull requests: read `references/stacked-prs.md` first.

### Reviewers

Reviewers come from the project CLAUDE.md. When it names none, ask the user. Request each reviewer in its own call, then check the list: a multi-login request has been seen to keep only one login, and `gh pr edit --add-reviewer` to remove one already requested.

```sh
owner_repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
gh api -X POST "repos/$owner_repo/pulls/<number>/requested_reviewers" -f 'reviewers[]=<login>'
gh api "repos/$owner_repo/pulls/<number>/requested_reviewers" --jq '[.users[].login]'
```
