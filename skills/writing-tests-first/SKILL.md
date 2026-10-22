---
name: writing-tests-first
description: Test-first loop for any behaviour change - case list before code, contract, one failing test at a time watched red for the right reason, smallest change. Covers test levels by project size, abuse cases, test doubles, bugs, flaky tests and frozen tests in a workflow. Use before writing or changing code, when choosing what or how to test, when tempted to mock, or when a test passes on its first run.
---

# Writing tests first

This skill owns **when** a test is written, **what** it covers, **at which level** and **with which doubles**. How a test reads (its name, one behaviour per test, arrange-act-assert) is in `writing-clean-code`. The project's test commands are in its CLAUDE.md or `.claude/workflow.json`.

TDD here is a design tool, not a quality gate. The test is the first caller of code that does not exist yet, so it forces the name, the signature, the error shape and the response shape to be decided while they are still free to change. For an agent it is more than that: the tests are the one specification it cannot talk itself out of (`references/evidence.md`).

## The loop

For every behaviour change outside a workflow, in this order. Do not skip step 1 and do not merge steps.

1. **List the cases** in your message, never in a scratch file: happy path, every rejection, every boundary, and the abuse cases the "Abuse cases" section owes. Decide nothing about the implementation here. For a small task, state the list and proceed; for a non-trivial one, the list is part of the plan the user approves.
2. **Fix the contract.** Schema and types first (the validator schema, the migration, the prop type), and stubs that throw "not implemented". The tests then fail on assertions rather than on imports.
3. **Turn exactly one case into a runnable test.** Making the first case pass usually changes decisions the other tests would have been written against.
4. **Run it and read the failure.** It must fail for the reason the case names. An import error, a typo or a missing provider is a broken test, not a red one. Quote the failing line in your message.
5. **Make it pass with the smallest change** that keeps every other test green.
6. **Refactor** with the suite green: structure changes, behaviour does not.
7. **Cross the case off, add any case the implementation revealed, and go back to step 3.**

A cycle that stays red for long means the step was too big: revert to green and split it.

## Inside a workflow

In a `/workflow` build, the cases come from the approved `slices.md` and the order changes in one place: the slice's tests are written together, because they were specified and approved before any code, and they are locked as a set.

1. Contract first, as in step 2.
2. Write a test for every acceptance criterion of the slice, at the levels the slice names.
3. Call `mcp__workflow__lock`. It answers with the exact command to run. Run it as given, read each failure, fix any broken test, then call lock again.
4. From the lock on, the tests are frozen: the mod refuses edits to them and restores any change made through the shell. Implement until they pass.
5. `mcp__workflow__verify` closes the slice once it has seen the slice tests, lint, typecheck and the full suite pass on the current code.

## Non-negotiables

- **A change arrives with its test, or it is incomplete.** Including a one-line change.
- **Never weaken a test to get green.** No removed assertion, no skip, no commented-out test, no widened matcher, no snapshot updated without reading its diff.
- **Never let the output teach the test.** When the real value differs from the expectation, decide which one is wrong from the spec, not from the output.
- **Frozen tests.** Once a test is red for the right reason, it does not change until it is green.
- **No special-casing.** Never make the implementation detect the test: no branch on a fixture value, no hardcoded return for the case.
- **A test that passes on its first run is telling you something**: the behaviour exists already, or the test does not test what you think. Find out which before writing any implementation.
- **Run the file you are driving on every cycle, and the whole suite before calling the step done.**

## The way out

Cheating mostly happens when there is no legitimate exit. This is the exit.

After 3 real attempts on a red test, or as soon as a test looks wrong, stop and report: the test, what it expects, what the code does, and why you believe the test or the requirement is wrong, or what blocks you. Then wait. Changing the test is the user's decision; in a workflow it goes through `mcp__workflow__unlock`, which asks them.

## Test levels by project size

Decided once per project (in the workflow's design phase), and written in the project CLAUDE.md.

| Project | Unit | Integration | E2E | Abuse cases |
| --- | --- | --- | --- | --- |
| Solo tool or script, no users | Logic | Only where the database or IO is the point | None | Only on untrusted input |
| Personal app, deployed | Logic | API and database | One smoke test of the main journey | Auth and every route taking input |
| Multi-user, team or production | Logic | Real database and everything it enforces | One per key journey | One per positive case on sensitive surfaces |

What raises the level: auth, several users, untrusted input, money or personal data, a public deployment. Security tests are these abuse cases, not a separate suite.

## What to test, and where

| The thing to prove | Level |
| --- | --- |
| A rule written in code | Unit test next to the code |
| A route's status code and response shape | Through the real HTTP layer |
| What the database enforces: constraints, policies, cascades, triggers, grants | A real database (a container), never a mocked client |
| A component or screen behaviour | Testing Library, or the framework's equivalent, through the project's render helper |
| A user journey | One end-to-end spec per journey |
| A command-line tool | Run it with arguments, assert its output and exit code |
| Model output | The contract around the answer, never its prose (`references/hard-cases.md`) |

Prove each behaviour at the lowest level that can actually fail it, and prove it once. Then exercise the real thing: green tests are not a demonstration.

## Abuse cases

A functional case asks whether the feature works for someone entitled to it. An abuse case asks what someone not entitled to it gets. A suite of happy paths passes on code with no access control at all, the most common defect in agent-written code.

**A change that touches a surface in the `writing-secure-code` trigger table owes at least one abuse case per positive case it adds**, written in the same cycle and failing first.

| The change adds | The abuse case |
| --- | --- |
| A route reading an id | The same call with another user's id, and another tenant's when there are tenants: 404, same body as a missing id |
| A route behind a permission | Every role that may not call it: 403. No token and an expired token: 401 |
| A write schema | An unexpected field, and a field the caller may not set (`role`, `owner_id`): rejected, stored row unchanged |
| A credential-accepting route | Repeated failures hitting the throttle: 429 with `Retry-After` |
| A token or session path | A revoked token, a replayed refresh token, a session used after a password change |
| A file or URL from a caller | A traversal path, an oversized or mistyped file, a URL to a private address |
| A dependency that can fail | The dependency failing: a refusal, never a permissive default |

Assert the observable behaviour: the status, the body, what is not in the body. Never assert that a guard was called: a spy passes on code that ignores the result. The catalogue per surface is in `references/abuse-cases.md`.

## Test doubles

**Default: no double.** When the real collaborator is in-process, deterministic and fast, use it.

- Justify every double in one line: what it replaces, and why the real thing cannot run here. No line, no double.
- Never double what the database, the framework or the schema enforces: a mocked client cannot fail a constraint or a policy.
- Never double what you do not own. Wrap the third party (storage, model provider, mailer) in your own adapter and fake the adapter.
- Prefer a fake (in-memory implementation, container, request interceptor such as MSW) to a mock, and a stub returning data to a spy counting calls.
- Treat your own urge to mock as suspect. Agents add mocks markedly more often than humans, and an over-mocked suite stays green while the wiring is broken.

## When the test cannot come first

- **A spike** to learn something: timebox it, delete it, start again test-first.
- **A bug**: the reproduction is the first test, at the lowest level that shows the bug as a user sees it. It stays as the regression test, named for the behaviour.
- **Generated code, pure config, a dependency bump**: no test. Say so in your report.
- Model output, time and randomness, code with no seam, a third party you cannot run, a migration, streaming, flakiness: read `references/hard-cases.md` first.

## Before calling it done

1. Every case on the list is a passing test or a line in your report saying why not.
2. The full suite is green, plus typecheck, lint and format check.
3. Reread the diff as a reviewer: no skipped or focused test left behind, no debug logging, no double you cannot justify.
4. Report what has no test and why, and every existing test you changed, with the reason.

## Rules deliberately not followed

- **A coverage percentage as a goal.** Coverage says which lines ran, not what was asserted.
- **One test file per class with every collaborator mocked.** It pins the structure, breaks on every refactor and survives real breakage.
- **Converting the whole case list into tests before making any pass**, outside a workflow. A workflow slice is the exception because its cases were approved before any code and the slice is small.
- **A test per getter, per field or per framework behaviour.** Test what was decided, not the framework.
- **Asserting the exact wording of a model answer.**

## References

- `references/hard-cases.md`: model output, time and randomness, code with no seam, third parties, migrations, streaming, bugs, spikes, flakiness.
- `references/abuse-cases.md`: what each security surface owes, at which level, and what not to write.
- `references/evidence.md`: the sources behind these rules. Read when a rule looks arbitrary or is being argued about.
