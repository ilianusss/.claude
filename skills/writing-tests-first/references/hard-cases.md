# When the plain loop is hard

The cases where the loop of `writing-tests-first` does not apply as written.

## Contents

- Model output
- Time, randomness and identifiers
- Code with no seam
- A third party you cannot run locally
- A database migration
- Streaming
- A bug
- A spike
- Flakiness

## Model output

An LLM answer is not a value you can assert. Assert the contract around it, which is deterministic and is where the bugs live:

- What was retrieved: the ids, that each belongs to the caller, the count, the order.
- That a score below the relevance threshold produces the refusal and never an invented answer.
- The shape of citations or structured output, and that each reference resolves.
- The guardrail verdict on a crafted input (injection attempt, personal data, out-of-scope question).
- The caps: tokens, turns, context size, and the log row written on every termination, errors included.

Drive the pipeline with a stub model returning a canned completion, so the test owns the output. A temperature above zero inside a test is a bug. Answer quality is a separate evaluation over a fixed question set: it is not a unit test and never asserts an exact string.

## Time, randomness and identifiers

Inject the clock and the id generator at the boundary and fake them in the test. Anything with an expiry (a token TTL, a sweeper, a quota window) is tested by moving the clock, never by waiting. No `sleep` in a test: wait on the observable condition, and if there is nothing observable to wait for, the production code is missing a signal.

## Code with no seam

Before changing behaviour you cannot reach from a test:

1. Pin the current behaviour with the highest-level test that can see it, an end-to-end test if nothing lower is reachable. It records what must not break, odd parts included.
2. Refactor structure only, green between each step, until a seam exists (`writing-clean-code`, `references/cleaning-up.md`).
3. Drive the new behaviour test-first through that seam.

If no test can be placed around the code at all, stop and say so, with the smallest seam you would add.

## A third party you cannot run locally

Storage, model and embedding providers, the mailer, a payment API. Two pieces, both required:

- A contract test against **your** adapter, driven by a fake: the calls made, the errors mapped, the retries and the timeout.
- A short manual checklist in your report for the real round trip. Never claim it works because the fake passed.

A mock of someone else's SDK records what you assumed, not how it behaves.

## A database migration

The migration is the contract step of the loop, not the implementation step. The test runs against a real database and asserts what the migration promises: the constraint refuses the bad row, the policy hides the other user's row, the cascade removes the children, the role has no write grant. Additive first, destructive in a later release (`changing-database-schema`).

## Streaming

Assert the event vocabulary and the sequence, the terminal event, cancellation propagating end to end, and resume after a dropped connection. Never assert timing or heartbeat intervals: that is how a suite becomes flaky on a loaded CI runner.

## A bug

Reproduce it first, at the lowest level that shows it as the user sees it. That test is the bug report: it must fail for the reason the bug exists, not merely fail. Then fix it. Name the test for the behaviour it protects, not the incident. If the bug cannot be reproduced by a test, the fix is a guess: say so.

## A spike

Timebox it, keep it off the branch you will push, and delete it once you know the answer. Then start the real work test-first. Spike code is never promoted, however well it works. What you learned goes in your report, or in an ADR when it outlives the task.

## Flakiness

A flaky test is a failing test. Quarantining or deleting it discards the bug it found, usually a real race in the product. Look in this order:

1. Shared state between tests: one database, one cache, one temp folder.
2. A missing wait on an observable condition, replaced by a timeout that is usually long enough.
3. Order dependence: the suite passes in order and fails alone, or the reverse. Run the single file to find out.
4. Real non-determinism in the product: an unordered result treated as ordered, a clock, a concurrent write. Fix the product, not the assertion.
