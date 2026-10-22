---
paths:
  - "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"
---

# TypeScript and JavaScript

- Strict mode. No `any`, and no cast or `!` to silence the compiler: take `unknown` and narrow it.
- Parse at the boundary with the codebase's validator (zod, valibot, class-validator in NestJS). Types come from the schema (`z.infer`), never declared beside it.
- Discriminated unions over bags of optional fields.
- No floating promises. `async` only when the function awaits.
- `import type` for imports used only as types.
