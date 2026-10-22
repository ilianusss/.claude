---
name: writing-github-issues
description: Writing and filing a GitHub issue - the questions to ask before drafting, the scope of one issue and when to split it, parent issues with sub-issues, the title and body skeleton, the precision expected, and creation with gh. Use when asked to create, write, draft, file or split an issue, a ticket, a bug report or a feature request, or when work is too big for one pull request.
---

# Writing a GitHub issue

An issue is done when someone who never saw this conversation can start, finish and verify the work without asking a single question.

## Workflow

Copy this checklist and track it:

```text
- [ ] Context gathered, duplicates searched
- [ ] Every open point asked and answered
- [ ] Scope checked, split if needed
- [ ] Parent and sub-issues decided when split
- [ ] Draft written from the skeleton
- [ ] Checklist passes
- [ ] Draft approved by the user
- [ ] Issue created
- [ ] Sub-issues attached to the parent and checked
- [ ] Assignee asked and set
```

1. **Gather.** Read the request and the code in scope: the current behaviour, the file paths, the exact error text. The repo is `gh repo view --json nameWithOwner --jq .nameWithOwner` unless the user names another. Search for duplicates with `gh issue list -R <owner/repo> --state all --search "<keywords>"`; a match goes to the user before any draft.
2. **Ask.** Ask the user for every missing detail before drafting. Never fill a gap with a guess, a default or general knowledge. Batch the questions with AskUserQuestion and ask again until nothing is open. Always settle:
   - the repo and the type (Bug, Feature or Task);
   - for a bug: the exact steps from a known state and what actually happens;
   - the expected behaviour, in observable terms;
   - the acceptance criteria and what is out of scope.
3. **Check the scope** (next section). Propose a split to the user before drafting several issues.
4. **Draft** from the skeleton, then run the checklist and fix what it finds.
5. **Show** the full draft (repo, type, title, body) and wait for an explicit OK. After any change, show it again.
6. **Create it.** Write the body to a file in the scratchpad, then:
   ```sh
   gh issue create -R <owner/repo> --type <Bug|Feature|Task> --title "<title>" --body-file <file>
   ```
   If the repo has no issue types, `gh` says so: ask the user whether to use a label instead. A split goes parent first, then each sub-issue, then the attachment.
7. **Assign.** Ask who to assign with AskUserQuestion (`multiSelect: true`), offering the members from `gh api orgs/<org>/members --jq '.[].login'` or, for a personal repo, the owner. Then `gh issue edit <number> -R <owner/repo> --add-assignee <login>`. If `gh` rejects a login, report it; never pick a replacement yourself.
8. **Report** the issue URL and its assignees.

## Scope of one issue

One issue is one outcome in one repo, closed by one pull request, verified by one list of acceptance criteria. Split when:

- it touches more than one repo: one issue per repo, the contract first, attached to a parent;
- the title needs "and", or two parts could ship and be verified independently;
- it is more than one pull request of work (`following-git-conventions`, Size: roughly 500 changed lines or 10 files);
- the acceptance criteria cover unrelated behaviours, or run past about seven items;
- part of it waits on a decision nobody has made: file the decided part, take the decision back to the user.

Do not split below a change worth reviewing on its own.

## Sub-issues

When parts only make sense together, file a parent issue for the outcome and attach each part as a sub-issue; GitHub then shows progress on the parent. Two issues that merely touch the same file are not parent and children: link them under `Related`.

- **The parent:** type Feature or Task, never Bug (a bug needing several pull requests is a Task parent with Bug children). Its body holds Context, Expected behaviour and the acceptance criteria of the whole outcome. It lives in the repo whose pull request merges first, and it is closed by its children.
- **The children:** one repo, one pull request, the full skeleton each. Children of one repo that build on each other become one stack (`following-git-conventions`, `references/stacked-prs.md`).

Attaching is a REST call. It takes the child's numeric database id, not its issue number and not the `I_kwDO...` node id:

```sh
child_id=$(gh api repos/<child-owner/repo>/issues/<child-number> --jq '.id')
gh api -X POST repos/<parent-owner/repo>/issues/<parent-number>/sub_issues -F sub_issue_id="$child_id"
gh api repos/<parent-owner/repo>/issues/<parent-number>/sub_issues --jq '[.[].number]'
```

Attach one child per call, then run the last command once and check every number is listed. `-F` is required; with `-f` the id goes as a string and the call fails:

```text
422 Invalid property /sub_issue_id: `"5921210696"` is not of type `integer`.
```

A `404 Not Found` on a call that passed the type check means the id is wrong: it must come from the child's `.id`.

## Level of precision

- Describe the behaviour, not the implementation. Name what a reader needs to find the spot: the role, the page or route, the endpoint, the file path. Implementation goes under Notes, and only when already decided.
- Exact over approximate: the exact error, status code, value or log line, verbatim in a `text` block.
- No vague verb without a criterion ("improve", "clean up", "handle properly", "etc."): say what is observably true once done.
- Every acceptance criterion is a checkbox a reviewer marks pass or fail by looking at the app, the API or a test. Include the negative case when access is involved ("a viewer gets 403").
- Self-contained: link another issue or pull request by URL or `<owner/repo>#<number>`.

## Skeleton

Title: imperative, specific, under 70 characters, no type prefix. "Add a delete action to the conversation menu", not "Conversation improvements".

Body, in this order. Bug-only sections are skipped for a Feature or a Task; an optional section with nothing to say is omitted.

```markdown
## Context
Why this matters and who is affected, in two or three sentences.

## Steps to reproduce
(Bug only) 1. Sign in as ... 2. Open ... 3. Click ...

## Current behaviour
(Bug only) What happens, with the exact error or log.

## Expected behaviour
What must happen instead, stated so nobody can read it two ways.

## Acceptance criteria
- [ ] Observable, testable statement
- [ ] Negative case when relevant

## Out of scope
(Optional) What this issue deliberately does not cover.

## Related
(Optional) Linked issues and pull requests.

## Notes
(Optional) Decisions already made, pointers to code, environment for a bug.
```

Screenshots cannot be uploaded through `gh`: tell the user to drag them into the issue after creation.

## Checklist

- Someone who never saw this conversation could start without asking a question.
- No guess, TBD, TODO or open question left in the body.
- Expected behaviour stated; every acceptance criterion is pass or fail.
- One repo, one pull request worth of work.
- Title imperative, specific, under 70 characters.
- No emoji, no em or en dash, no secret or credential.
