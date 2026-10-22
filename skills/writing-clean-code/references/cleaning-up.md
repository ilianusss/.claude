# Cleaning up existing code

Read before refactoring, tidying or reviewing code you did not just write.

## The two rules that bound every cleanup

1. **Never mix a structural change with a behavioural one.** Rename, extract, reorder, delete dead code: these keep behaviour identical and the tests green at every step. Changing behaviour is a separate step, and a separate commit. A diff that does both is unreviewable, and when it breaks nobody can tell which half did it.
2. **Stay in the task's scope.** Tidy the code you are already changing, in the file you are already in. A wider cleanup is its own task: ask first.

## The comment audit

For every file you touch, in order:

1. Skip generated and vendored files entirely, and anything with a "do not edit" banner.
2. Keep every toolchain directive and licence header. A directive with no reason gets its reason added, not removed.
3. For each other comment, ask whether it says why, names a rejected alternative, states an external constraint, or justifies a deliberate duplication.
   - **Yes:** keep it. Correct it only if the code moved and it now lies.
   - **No:** delete it.
   - **Cannot tell:** keep it and list it in your report.
4. When a comment goes because the code should say it, make the code say it in the same step: rename, name the constant, extract the function.
5. Re-run the checks.

## Tidyings

Small, behaviour-preserving changes. Apply the ones the file needs, not the whole list.

| Tidying | Apply when |
| --- | --- |
| Delete dead code | Anything unreachable, unused or commented out |
| Guard clauses | The happy path is wrapped in conditions |
| Explaining variable or constant | An expression or a literal needs a name |
| Explicit parameters | A function reads values from a wider scope |
| Chunk statements | A long function has blocks that each do one thing: blank-line them before extracting |
| Extract helper | A chunk has a name and a reason of its own, not merely to shorten |
| Normalise symmetries | Two places do the same thing in two shapes |
| Reading order, cohesion order | The file is not in the order a reader needs, or things that change together are far apart |
| New interface, old implementation | The call you want does not exist: add it as a thin pass to the old one, migrate callers, delete the old one in the same task |

A helper used once and read once usually adds a jump without adding meaning: prefer chunking.

## Safe order of work

1. Confirm a test covers the behaviour you are about to restructure. If none does, write one first against the current behaviour and watch it pass.
2. One tidying, then the checks. Repeat.
3. Only then change behaviour, test first.
4. Reread the whole diff as a reviewer.

If a tidying turns out to need a behaviour change, that is a finding: stop and report it.

## Code with no test

- Pin the current behaviour with a characterisation test before touching anything, even if it looks wrong.
- If the code cannot be tested without restructuring, make the smallest mechanical restructure that makes it reachable: extract the decision from the IO, inject the dependency.
- Wrong behaviour the test now pins is a separate report, not a silent fix.

## When not to clean

- The file is generated, vendored, or a migration already applied.
- The cleanup would touch code the task does not touch: mention it instead.
- You cannot run the tests: without them, a behaviour-preserving change is only a hope.
- The change is large and not approved.
