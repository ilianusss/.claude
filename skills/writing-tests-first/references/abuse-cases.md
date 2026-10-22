# Abuse cases per surface

What a change owes beyond its happy path, where the test belongs, and the shapes that prove something. Each line is one item on the case list, turned into one failing test at a time.

## Contents

- Choosing the level
- Authentication
- Authorisation between roles
- Authorisation between users
- Tenant isolation
- Payloads and mass assignment
- Files, paths and URLs
- Error paths and failing closed
- Rate limits and quotas
- What not to write

## Choosing the level

| Question the abuse case asks | Level |
| --- | --- |
| Does the permission table allow this? | Unit, next to the table |
| Does the route refuse it? | End to end, through the real HTTP layer |
| Does the database refuse it? | A real database |
| Does the screen hide it? | Component test |

A refusal only the UI performs is not proved by a UI test. Prove the refusal where it is enforced, then prove the UI separately if the screen owes it.

## Authentication

For any route that accepts or issues a credential:

- No token: 401.
- A token signed with another key, an expired token, a token with its algorithm changed: 401, same body for each.
- A revoked token, and a refresh token replayed after rotation: 401.
- A session used after the password changed: 401.
- Wrong password and unknown account return the same status and body. Assert they match each other, which is the point.
- A temporary lockout is 429 with `Retry-After`.

## Authorisation between roles

Drive the whole role-by-action matrix, not a sample. A table-driven test over every role and action with the expected outcome is shorter and more complete than hand-picked cases, and it fails loudly when an action is added to the table and nowhere else. An admin role gets its own cases: assert a refusal wherever the matrix refuses it.

## Authorisation between users

The case most often missing (BOLA, broken object level authorisation). Two users with the same role:

- User B's object requested with user A's valid session: 404, the same body as a missing id.
- The same for every verb the route family exposes, including delete and the list endpoint, where the assertion is that B's object is absent.
- A write that would move an object to an owner the caller is not: refused.

Check ownership in the same query that fetches the object, so the test fails if the predicate moves out of it.

## Tenant isolation

Only for multi-tenant products, and only against a real database:

- The same id read as tenant A and as tenant B: found once, absent once.
- A write attempted for the other tenant: refused by the database or the data layer, not by a service that chose not to ask.
- A query with no tenant context at all: returns nothing.
- A new table added by the change: the isolation rule exists on it and the three cases above hold.

## Payloads and mass assignment

- An unexpected field in the body: rejected, because write schemas are strict.
- A field the caller may not set (`role`, `owner_id`, `is_admin`, a billing column): rejected, and the stored row unchanged. Assert the row, not only the status: a route that silently ignores the field passes a status-only test and fails the day someone spreads the payload.
- Type confusion: an array where a string is expected, a number as a string, a nested object, `null`. The schema rejects; the handler is never reached.
- A string at and past its maximum length, and an empty string where one is required.

## Files, paths and URLs

- A filename with `..`, a leading `/`, a NUL byte or a path separator: rejected, and nothing written outside the intended root. Assert the resolved path, not the error message.
- A file larger than the cap, and a file whose bytes do not match its declared type: rejected before parsing.
- An archive that expands far beyond its compressed size: refused without exhausting memory. Keep the fixture small; the assertion is the refusal.
- A URL to a private or loopback address, a redirect to one, a scheme other than `http` or `https`: refused before the server fetches it (SSRF).

## Error paths and failing closed

- The dependency a check needs is down (cache, database, an internal service returning 500): the request is refused, not served from a default. Make the double fail and assert the refusal.
- An unexpected enum value, an unknown status, a claim missing from a token: refused.
- An upstream error message does not appear in the response body. Assert its absence by substring.
- No secret, token or key appears in what is logged during the failure. Capture the logger and assert on what it received.

## Rate limits and quotas

- The call that crosses the threshold: 429 with `Retry-After`. The call just below it: served.
- The counter uses the right key: a second user or tenant is unaffected by the first one's limit. This catches a limiter keyed on nothing.
- A quota at zero refuses before any billable work starts, and a reservation is released when the work fails.

## What not to write

- A spy asserting that a guard, a permission helper or a sanitiser was called. It passes on code that calls the check and ignores the result.
- A test asserting the exact wording of an error message. Assert the status, the shape and the absence of leaked detail.
- A payload copied from a public exploit list. Write the case for your rule, with the smallest input that expresses it.
- The same refusal at three levels. Prove each refusal once, where it is enforced.
