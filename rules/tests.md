---
paths:
  - "**/*.{test,spec}.*"
  - "**/__tests__/**"
  - "**/tests/**"
  - "**/test/**"
  - "**/spec/**"
  - "**/e2e/**"
  - "**/*_test.go"
  - "**/test_*.py"
  - "**/*_test.py"
---

# Tests

The test is the spec. These hold in every session, workflow or not.

- Never weaken a test to get green: no removed assertion, no skip or `.only`, no widened matcher, no snapshot update you have not read line by line.
- Never adjust an expectation to match what the code returns. If the expectation is wrong, say why with evidence and ask.
- A test that passes on its first run is suspect: check that it can fail (break the code on purpose, or read why it passes).
- Never special-case the implementation for a test (a branch on a test id, a hardcoded return for the fixture).
- If a test looks wrong, stop, explain with evidence, and ask. In a workflow, unlocking a test needs my approval.
- Table-driven tests are fine.
- No `sleep` to wait for something: wait on an observable condition.
- Every test you changed goes in your report with the reason.
