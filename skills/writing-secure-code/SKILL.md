---
name: writing-secure-code
description: Secure-coding rules for any stack - server-side authorisation, failing closed, secrets, parsing untrusted input before any sink, verifying a dependency before adding it, what errors and logs may carry, and when a change needs a security review. Use before writing code that touches auth, a route, a query, user input, a file, a URL, a secret, a dependency, an error path or a log line.
---

# Writing secure code

The rules that hold in every language. A project adds its own overlay skill in `.claude/skills/` for the sinks of its stack (its ORM, its template engine, its framework's guards); where the overlay is stricter, it wins.

## The five rules

**1. Every authorisation decision is made on the server, from the signed credential, on every request.** Not from a path, query, header or body field, not from a value the client sent earlier, not once at the start of a flow. A hidden button and a client-side guard are usability, never a control: assume every endpoint is called directly with a valid session for someone else's object. Ownership is checked in the same query that fetches the object.

**2. Fail closed.** A missing claim, an unreachable dependency, a parse error, an unexpected enum value, a `catch` with no rethrow: the request is refused, not let through on a default. A `default:` branch over a role, a status or a channel rejects. Any exception is written down in the project, with its reason.

**3. A secret never leaves its process.** Not in a log line, an error message, a response body, a test fixture, a commit, a frontend bundle or a URL. Every environment variable the code reads is declared in the project's config schema and in `.env.example` in the same commit, with a placeholder. Key material is generated per environment and never hardcoded as a default.

**4. Untrusted input never reaches a sink unparsed.** Untrusted means anything from a browser, a visitor, a scraped page, an uploaded file, a model answer or a third-party API. Parse it into your own type at the boundary and pass the parsed value on. The sinks are listed in `references/owasp.md` (A05).

**5. A dependency is verified before it is added.** Next section.

## Dependencies

Agents hallucinate package names: around one in five packages suggested for Python and JavaScript does not exist, and attackers register the popular hallucinations. A successful install proves the name is registered, not that it is the right package.

1. Take the exact name from the library's own documentation or repository, never from memory.
2. Check it: `npm view <pkg> name time.created repository.url maintainers`, `https://pypi.org/project/<pkg>/`, `cargo info <crate>`, `go list -m -versions <module>`. Recently created, no repository, a maintainer with nothing else, or a name one character away from a popular package: stop and tell the user.
3. Add it with the project's own command (`npm install`, `pnpm add`, `uv add`, `cargo add`, `go get`) so the lockfile is written. Never edit a lockfile by hand.
4. Never pass `--force`, `--legacy-peer-deps` or `--no-verify` to get past a failure. Report the failure instead.

A package solving what the standard library solves, or doing what one already in the manifest does, is a no.

## Errors and logs

- An error returned to a client says what is wrong with the request and nothing about the inside: no stack trace, SQL, file path, library name, row contents or upstream message passed through.
- Someone else's resource and a missing one produce the same response. Authentication failures do not say which factor was wrong.
- Logs are structured. A line may carry ids, a correlation id, a status and a duration; never a token, password, secret, cookie, presigned URL, request body or full row. Logging an error object logs whatever it wrapped: log chosen fields.
- Security-relevant events, successful or not, are logged with enough to investigate later.

## When a change needs a security review

The review runs in a fresh context, because the author agrees with its own code (`references/agent-risks.md`). In a workflow it is the reviewer's security lens in the inspect phase; outside one, run the `reviewer` agent with the security lens, or the built-in `/security-review` for auth, payments or a public release.

| Surface | Examples |
| --- | --- |
| Identity | login, token, session, password, cookie, invitation, role, permission, a guard |
| Route surface | a route added, a path, method or guard changed, a public route, CORS, a response header |
| Data access | raw SQL, a query built from strings, a migration touching constraints, policies or grants |
| Input reaching a sink | a path, a URL the server fetches, a subprocess, a deserializer, a template, a regex from input, a redirect |
| Files and storage | upload, download, presigned URL, content type, size limit |
| Secrets and crypto | an environment variable, a key, hashing, signing, randomness |
| Dependencies | a package added or replaced, a base image changed |
| Error and log paths | a new catch, a fallback on failure, a changed status code, a newly logged object |
| Public surface | anything an anonymous visitor reaches |

No review for: copy and styling, a test-only change, docs, a refactor that changes no behaviour, generated files, a type-only change, a version bump of a package already in the manifest.

## Before calling a change done

1. Every rule above holds for the lines you added and the lines you moved.
2. The abuse cases the change owes exist as tests (`writing-tests-first`).
3. Nothing is disabled, suppressed or allow-listed to make a check pass: no security lint rule turned off, no `any`, no skipped test, no widened CORS origin.
4. If the change went through several rounds of correction, say so in your report: that is when controls get dropped.

## References

- `references/agent-risks.md`: the vulnerability patterns measured in agent-written code and the counter-rule for each. Read before a change to auth, sessions or dependencies, and before reviewing code written in one pass.
- `references/owasp.md`: the OWASP Top 10:2025, the API Top 10 names, the injection sinks, and which edition of each list is current. Read when naming a finding.
