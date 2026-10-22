# OWASP reference

A map for naming a finding, not a checklist: the rules are in the skill.

## Top 10:2025 (web)

| Id | Category | What it looks like in code |
| --- | --- | --- |
| A01 | Broken Access Control | Another user's object reachable, a route missing its guard, SSRF (now folded in here) |
| A02 | Security Misconfiguration | CORS, cookie attributes, a debug endpoint in production, a container running as root, a verbose error page |
| A03 | Software Supply Chain Failures | A hallucinated or typosquatted package, an action pinned to a moving tag, a `latest` base image, a lockfile regenerated unread |
| A04 | Cryptographic Failures | `Math.random` for a token, `===` on secrets instead of a constant-time compare, an algorithm read from the token, TLS verification off |
| A05 | Injection | Input reaching a sink unparsed (table below), mass assignment through a spread payload |
| A06 | Insecure Design | The control that was never built: why abuse cases are listed before the code |
| A07 | Authentication Failures | No throttle, unrevocable refresh tokens, no replay detection, sessions surviving a password change |
| A08 | Software or Data Integrity Failures | Deserialising untrusted data (`pickle`, `yaml.load`), an update with no integrity check, CI running code fetched at build time |
| A09 | Security Logging and Alerting Failures | Security events not logged, or logged where nobody looks |
| A10 | Mishandling of Exceptional Conditions | Failing open: a swallowed error, a fallback value, a check skipped when a dependency is down |

## Injection sinks

| Sink | Rule |
| --- | --- |
| SQL | Parameters only. Never a template string, f-string or `format!` in a query; never the ORM's unsafe raw call |
| Shell | No shell. An argument list, never a string, never interpolated input |
| Filesystem | Resolve the path and check it is inside the intended root before opening it |
| HTML and templates | The framework's escaping. No raw HTML injection (`dangerouslySetInnerHTML`, `v-html`, `innerHTML`), never raw model output |
| URLs fetched by the server | Allow-list schemes and hosts, refuse private and loopback addresses, recheck after redirects |
| A prompt | Untrusted text in clearly delimited regions, never trusted as instructions |

## API Security Top 10 (2023)

Sharper names for the authorisation failures agents make most:

- **API1 BOLA**, broken object level authorisation: allowed on the route, not on this object.
- **API3 BOPLA**, broken object property level authorisation: allowed to update the object, not this field. Mass assignment.
- **API5 BFLA**, broken function level authorisation: not allowed on the route at all, a missing guard.
- **API4 Unrestricted resource consumption**: no quota, throttle or parse limit.

## Which edition is current

Check this before citing a year, and never "update" a reference to an edition that does not exist.

| List | Current edition | Note |
| --- | --- | --- |
| Top 10 (web) | 2025, published November 2025 | On a four-year cycle. There is no 2026 web Top 10 |
| Top 10 for LLM Applications | 2026, published August 2026 | For prompt injection, grounding and output handling: do not map those onto web categories |
| API Security Top 10 | 2023 | Still current |
| ASVS | 5.0, May 2025 | Requirement-level detail when a control needs more than a category name. A reference to consult, not a checklist |
