# What agent-written code gets wrong

The failure patterns measured in agent-written code are not random: the same classes recur across models, tasks and codebases, which makes them checkable. Read this before a change to authentication, authorisation, sessions or dependencies, and before reviewing a feature written in one pass.

## The measured patterns

Across agent-built applications, vulnerabilities appeared in the large majority of pull requests, and the same categories recurred often enough to be structural. Ranked by frequency:

1. **Broken access control between users.** The agent writes the query that fetches the object and forgets the caller may not be allowed this object. Counter-rule: the ownership predicate goes in the same query as the fetch, and an abuse test asks for another user's object with a valid session.
2. **Business-logic gaps.** A price, quota, plan limit or state transition validated in the UI and trusted by the server. Counter-rule: the server recomputes every value it acts on; nothing a client sends feeds a billing or quota decision.
3. **Authentication-flow gaps.** A policy applied to one entry point and not another: a guard on the REST route but not on the streaming or webhook route. Counter-rule: when a feature has two entry points, both are on the case list.
4. **Insecure token and session defaults.** Refresh tokens that cannot be revoked, rotation without replay detection, a session that outlives a password change, an algorithm read from the token header, cookie attributes left at their defaults.
5. **No brute-force protection.** The login route is built and the throttle is not, because nothing asked for it. Counter-rule: a credential-accepting route owes its throttle in the same change.
6. **Hardcoded credentials and leaked secrets.** A default secret so the code runs, a real value in `.env.example`, a key in a fixture, a token logged while debugging. Counter-rule: grep the diff for these shapes before calling it done.
7. **Hallucinated and typosquatted dependencies.** Around one in five suggested packages does not exist, and attackers register the names that recur. Counter-rule: the dependency check in the skill.
8. **Failing open on the error path.** A `catch` returning a default, a check skipped when a dependency is down, an unknown enum value treated as the permissive case. Counter-rule: an abuse test that makes the dependency fail and asserts a refusal.

## The two habits behind them

**Iterating makes it worse.** Security degrades across refinement rounds: each pass optimises for the instruction just given, and controls added earlier are the lines most easily dropped. A feature through five rounds of "now also handle X" needs a review more than a first draft does.

**The author agrees with itself.** Asking the same context whether its code is secure returns yes, because the reasoning that produced the bug produces the justification. That is why the review runs in a fresh context and reads the diff, not the explanation of the diff.

## In practice

- A control nobody asked for still has to be there: the throttle, the revocation path, the ownership check.
- Prefer the boring construct the stack has over the one that compiles: a parameterised query over a built string, an argument list over a shell string, a mapped response over a spread object.
- Never suppress a check to finish. A disabled lint rule, a cast, a skipped test or a widened CORS origin added at the end of a session is a finding in itself.

## Sources

- DryRun Security, agent-built application study, March 2026: vulnerabilities in 87% of pull requests (143 issues over 30 pull requests), across three coding agents and two applications.
- Cloud Security Alliance research note on AI codegen vulnerability debt, April 2026: 45% to 70% of generated samples fail security tests depending on method; around 19.7% of suggested Python and JavaScript dependencies are non-existent names.
- "Security Degradation in Iterative AI Code Generation", arXiv 2506.11022.
