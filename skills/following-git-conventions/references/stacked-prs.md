# Stacked pull requests

A stack is a chain of branches in one repo, each with one pull request based on the branch below it, so a reviewer sees only that layer's diff. GitHub shows the stack on each of its pull requests and merges it bottom first.

## When to stack

- Stack the parts of one repo that build on each other: part 2 needs part 1's code to compile or pass its tests.
- Independent parts are separate pull requests against the default branch, not a stack.
- A stack never crosses repos. Each repo has its own pull requests, linked under `## Linked PR`.
- Each layer is one sub-issue of the parent (`writing-github-issues`, Sub-issues).

## Tool

Use the official `gh stack` extension. If `gh stack --help` reports it missing, ask the user to run `! gh extension install github/gh-stack`; do not install it yourself. `gh stack <command> --help` is the reference for flags (`gh stack help <command>` prints only the top-level help).

Under a terminal, several commands open a prompt or a full-screen UI and hang. Always pass the arguments that make them non-interactive:

| Run | Never run |
| --- | --- |
| `gh stack init <branch>...` | `gh stack init` |
| `gh stack add <branch>` | `gh stack add` |
| `gh stack submit --auto` | `gh stack submit` |
| `gh stack view --json` | `gh stack view` |
| `gh stack checkout <branch-or-pr>`, `gh stack up`, `gh stack down`, `gh stack top` | `gh stack checkout`, `gh stack switch`, `gh stack modify` |
| `gh stack merge <pr> --yes --squash` | `gh pr merge` on a stacked pull request |

## Create the stack

Create it once the user agreed to the split, before writing the parts: one layer per part, the foundation at the bottom. Every branch name follows the Branches rules; `gh stack` uses the name verbatim.

```sh
git switch <default-branch> && git pull
gh stack init <keyword>/<first-part>
# commit the first part
gh stack add <keyword>/<second-part>
# commit the second part
gh stack submit --auto
gh stack view --json
```

A branch that outgrew the size signal mid-work: keep the finished part on it, adopt it with `gh stack init <current-branch>`, then `gh stack add` the next layer and continue there.

## Finish each pull request

`submit --auto` opens every pull request as a draft with a generated title and body and no assignee. For each one:

1. `gh pr edit <number> --title "<header>" --body-file <file> --add-assignee @me`, with the title and body from the skill.
2. Under `## Linked PR`, list the whole stack in merge order and mark the current one:

   ```markdown
   Stack, merged in this order, each one based on the previous:

   1. #18 test(ingest): cover the reclaim cap
   1. #19 build: ship the tokenizer in the image (this one)
   ```

3. Request the reviewers as the skill describes.
4. `gh pr ready <number>` once it is ready for review.

## Change a layer

Commit a fix in the layer that owns it, never on the top branch, then replay the layers above:

```sh
gh stack checkout <branch>
# commit the fix
gh stack rebase --upstack
gh stack push
gh stack top
```

`gh stack sync` replaces the rebase on the default branch before review: it fetches, rebases every layer, pushes and refreshes the pull requests. On a conflict it restores every branch and exits 3: run `gh stack rebase`, resolve, `git add`, then `gh stack rebase --continue`.

## Merge

Merge only when the user asks. `gh stack merge <pr> --yes --squash` merges that pull request and every unmerged one below it, all or nothing. Then `gh stack sync` rebases the remaining layers and skips the squashed commits on its own.

Exit code 9 means stacked pull requests are unavailable on the repo: tell the user, do not fall back to plain pull requests on your own.
