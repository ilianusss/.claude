---
paths:
  - "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,py,go,rs,c,h,lua,sh}"
---

# Code

Follow the `writing-clean-code` skill for anything beyond a one-liner.

## Comments

- None by default. Write one only for: why, with the alternative you rejected; an external constraint (a bug in a dependency, a spec, an API quirk); a deliberate duplication; a toolchain directive (lint or type suppression), with its reason.
- Delete comments that restate the code you are changing. Keep, and mention in your report, any you cannot judge.
- No TODO or FIXME: do it now or list it in your report.

## Errors

- Use the language's and the codebase's idiom: exceptions in TypeScript and Python, error values in Go, `Result` in Rust, return codes in C, `error`/`pcall` in Lua. Log with the codebase's logger.
- Never swallow an error and never fall back to a permissive default (an empty list, `true`, an admin role) when something fails. Fail loudly at the point that knows enough to say why.
