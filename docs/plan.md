# Claude Code setup: plan

Status: approved, revision 2, 2026-10-22. Every open decision took its default (section 17). Target: Claude Code 2.1.308, Pro subscription.

This document describes the whole setup before anything is built. Once built, it gets split into `docs/architecture.md`, `docs/workflow.md`, `docs/editing.md` and `docs/decisions.md`, and this file is deleted.

Revision 2: the workflow is a mod (a plugin with a TypeScript hooks module) plus markdown, instead of a skill plus Python hooks and a `wf` CLI. The install replaces `~/.claude` instead of merging into it.

## Contents

1. Goals and constraints
2. Principles
3. Where each kind of instruction lives
4. Repository layout and installation
5. Always-loaded files: CLAUDE.md and settings.json
6. Rules
7. Knowledge skills
8. The workflow
9. Test lock: keeping tests and implementation apart
10. Review
11. Mods, settings hook and agent
12. Token budget
13. Documentation and editing the setup with Claude
14. Tests for the setup itself
15. To verify on this machine before building
16. Build order
17. Open decisions
18. Not now

---

## 1. Goals and constraints

- One personal setup for fullstack and devops work in any project: React, JavaScript, TypeScript, NestJS, Tailwind, Python, Go, Rust, C, Lua, Git, Docker, Terraform, Kubernetes, Helm.
- A project workflow (spec, design, slices, build, review, retro) driven by one command, resumable at any time, with several workflows in flight.
- TDD enforced by configuration where it matters, not only asked for in prose.
- Pro subscription: the token budget is a design constraint, not an afterthought.
- The repo `ilianusss/.claude` is `~/.claude` itself, and the only source of user-level skills.
- ZeBuilder is out of scope: it has its own `.claude-team` setup.

## 2. Principles

1. **One mechanism, one job.** CLAUDE.md for always-on intent, rules for file-type guidance, skills for knowledge on demand, agents for a fresh context, mods for logic and state, permissions and sandbox for hard limits.
2. **Code for what is deterministic, prose for what needs judgment.** Routing, state, locks, gates and status are code in a mod. Phase instructions, guides and knowledge are markdown.
3. **Prose states intent, configuration enforces it.** Anything that must hold (no em dash, frozen tests, no force push, no secret reads) has a mod guard, a permission or the sandbox behind it.
4. **Documents on disk are the handoff.** Every phase and every slice can start in a fresh session, which is also what keeps the token cost down.
5. **Global stays generic.** Commands, test globs, invariants and conventions of a project live in that project.
6. **Reuse what Anthropic maintains.** Built-in `/code-review`, `/security-review`, `/run`, `skill-creator`, the Explore and Plan agents.
7. **Keep a rule only if it changes behaviour.** The test is "would Claude do this unprompted", not "does Claude know this". Explanations of concepts Claude already knows are cut.
8. **The setup learns.** Corrections that repeat become rules through the retro phase.

## 3. Where each kind of instruction lives

| Mechanism                                 | Loaded                                         | Context cost                                    | Use it for                                                    |
| ----------------------------------------- | ---------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `CLAUDE.md`                               | Every session                                  | Always, keep under ~50 lines                    | Intent and rules that apply everywhere                        |
| `rules/*.md` with `paths`                 | When Claude reads or edits a matching file     | Only when relevant                              | Rules tied to a file type                                     |
| Skill, model-invocable                    | Description always, body when relevant         | Description: keep under ~400 chars              | Knowledge and procedures Claude should pick up on its own     |
| Skill, `disable-model-invocation: true`   | Nothing until typed                            | Zero until used                                 | Manual commands with no logic                                 |
| Agent                                     | When spawned, in its own context               | A full cold start each time                     | Fresh-context review                                          |
| Mod (plugin with a TypeScript hooks module) | At session start, from `CLAUDE_CODE_PLUGIN_DIRS` | Zero, except the text it chooses to send Claude | Commands with logic, state, guards that depend on state, status display |
| Permission, sandbox                       | Never in context                               | Zero unless it fires                            | Hard limits that hold even if a mod fails                     |

Verified in the docs for 2.1.308:

- `disable-model-invocation: true` keeps a skill's description out of context.
- A skill's description plus `when_to_use` is truncated at 1,536 characters in the listing.
- Agent frontmatter supports `tools`, `disallowedTools`, `model`, `effort`, `skills` (preloaded), `hooks` (scoped to the agent; `Stop` becomes `SubagentStop`), `isolation: worktree`, `maxTurns`.
- Agents shipped in a plugin ignore `hooks` and `permissionMode`, so agents stay in `~/.claude/agents/`, not in a mod.
- Skills shipped in a plugin are prefixed with its name (`skin:make-skin`), so knowledge skills stay in `~/.claude/skills/`.
- User-level rules in `~/.claude/rules/` are supported; their `paths` are relative to the session's primary working directory. A user rule and a project rule do not override each other ("Claude may follow either"), so project rules must extend, never contradict.
- `Read` and `Edit` deny rules are merged into the sandbox configuration, so they also apply to sandboxed shell commands.

Verified for mods, in the plugin-authoring skill and the type declarations of 2.1.308:

- **Shape.** A mod is a plugin folder: `.claude-plugin/plugin.json` and `hooks/hooks.json` naming one TypeScript module that exports `register(on, options)`. It has no Node: files, processes and git go through `$.fs` and `$.process`.
- **Stability.** The API is marked early access: "this surface may change between releases without notice".
- **Commands.** `$.command.register` adds `/workflow` with no plugin prefix. A `command.run` hook can answer in code with no model turn, attach hidden `context` for Claude, or start a turn with `$.prompt.submit`.
- **Guards.** `tool.call` hooks can deny or rewrite any tool call and read its result (for Bash: stdout, stderr, and `isError` on a failure). They run above the settings hooks, so they see a command before `rtk` rewrites it.
- **Asks.** A `tool.check` hook can answer `ask` on a built-in tool's call, and a mod's ask always goes to a person: "No classifier's allow settles it", so auto mode cannot approve it.
- **Tools.** `$.tool.register` gives Claude tools named `mcp__<mod>__<name>`. A tool the mod answers itself skips the engine's permission step entirely, settings rules included (measured in M0), so a tool that needs your approval asks with `$.ui.ask`: Claude Code's own question dialog, which only you answer.
- **Re-entry.** A `command.run` hook cannot run another command (the engine refuses: "it would wait on the turn this hook is holding"); it answers, then runs it from a timer or a later event.
- **Transcript.** `session.append` can rewrite the rows the conversation keeps, including the text of Claude's replies.
- **Display.** Status line entries, toasts, a band above the prompt, panes.
- **Processes.** `$.process.run` runs as you, outside the sandbox, with a 30 second default timeout and 10 minutes at most. Git runs with repo hooks off.
- **Storage.** `$.store` is one JSON store per mod, global (not per project), 4 MiB at most.
- **Loading.** `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json` (never a project's), `~` allowed. An interactive session watches the folders and reloads a mod when its files change.
- **Failure.** A hook that throws is skipped unless its `.catch` answers, so every guard has a `.catch` that refuses (fails closed).
- **Testing.** `claude plugin validate <dir>` checks the manifest and module; `claude plugin test <dir>` runs `*.test.ts` against the engine, with the test answering `fs`, `process`, clock and store.

## 4. Repository layout and installation

### Layout (the repo is `~/.claude`)

```text
~/.claude/
├── README.md                       what this is, install, daily use, links to docs/
├── .gitignore                      whitelist: everything ignored except the files below
├── CLAUDE.md
├── settings.json
├── rules/
│   ├── code.md
│   ├── tests.md
│   ├── typescript.md
│   ├── frontend.md
│   ├── infra.md
│   └── claude-setup.md
├── skills/
│   ├── writing-tests-first/        SKILL.md + references/hard-cases.md abuse-cases.md evidence.md
│   ├── writing-clean-code/         SKILL.md + references/cleaning-up.md
│   ├── writing-secure-code/        SKILL.md + references/agent-risks.md owasp.md
│   ├── following-git-conventions/  SKILL.md + references/stacked-prs.md
│   ├── writing-github-issues/      SKILL.md
│   ├── writing-readmes/            SKILL.md + references/skeleton.md
│   ├── changing-database-schema/   SKILL.md
│   ├── changing-infrastructure/    SKILL.md
│   └── editing-claude-setup/       SKILL.md
├── agents/
│   └── reviewer.md
├── .gitmodules                     mods/workflow -> ilianusss/claude-workflow
├── mods/
│   ├── workflow/                   git submodule, its own repo
│   │   ├── README.md               what it is, install as a plugin, commands
│   │   ├── .claude-plugin/plugin.json
│   │   ├── .claude-plugin/marketplace.json   so it installs anywhere with /plugin install
│   │   ├── hooks/hooks.json        names register.ts
│   │   ├── hooks/register.ts       wires events to src/
│   │   ├── src/                    commands, state, lock, guards, drift, status, prompts
│   │   ├── types/index.d.ts        the mod's session state contract
│   │   ├── phases/                 setup.md spec.md design.md slice.md build.md inspect.md retro.md
│   │   ├── guides/                 product-questions.md technical-questions.md decision-guide.md ears.md drift-check.md
│   │   ├── templates/              spec.md design.md slices.md adr.md project-claude.md workflow.json
│   │   ├── tests/                  *.test.ts
│   │   └── tsconfig.json
│   └── house/
│       ├── .claude-plugin/plugin.json
│       ├── hooks/hooks.json
│       ├── hooks/register.ts
│       ├── src/                    typography, test integrity
│       ├── tests/
│       └── tsconfig.json
└── docs/
    ├── plan.md                     this file, until the build is done
    ├── architecture.md
    ├── workflow.md
    ├── editing.md
    └── decisions.md
```

Two mods instead of one, so a broken update in one leaves the other working. `house` holds the rules that apply in every session; `workflow` holds everything about workflows.

`workflow` lives in its own repo, `git@github.com:ilianusss/claude-workflow.git`, included here as a git submodule. Here it loads from the folder through `CLAUDE_CODE_PLUGIN_DIRS`, so edits reload live; anywhere else it installs as a plugin with `/plugin install workflow --marketplace ilianusss/claude-workflow`. A change to it is committed in its repo, then the submodule pointer is moved in `~/.claude`. `house` is personal and stays in this repo.

The phase files, guides and templates are plain markdown read by the `workflow` mod, not skills: they never appear in the skill listing and are never triggered on their own. If the mod API breaks after an update, they still work by hand (section 13).

### .gitignore

Whitelist style, because `~/.claude` is full of runtime data (history, projects, sessions, caches, plugins, file-history):

- Ignore everything at the root (`/*`), then re-include `README.md`, `.gitignore`, `.gitmodules`, `CLAUDE.md`, `settings.json`, `rules/`, `skills/`, `agents/`, `mods/`, `docs/`.
- In `mods/`, ignore `*/.claude-plugin/types/` (the engine writes the API types there at each load).
- Anything installed later into `skills/` shows up as untracked: commit it, or move it to the project that needs it.

### Installation

- **New machine:** `git clone --recurse-submodules https://github.com/ilianusss/.claude.git ~/.claude`.
- **This machine:** replace the folder, then bring back the runtime data:
  1. Quit every Claude Code session.
  2. `mv ~/.claude ~/.claude.old`, then `git clone --recurse-submodules https://github.com/ilianusss/.claude.git ~/.claude`.
  3. Copy back from `~/.claude.old` everything except `skills/`, `CLAUDE.md`, `RTK.md`, `settings.json*` and `dev-mods/`. This keeps auto memory and transcripts (`projects/`), prompt history, installed plugins and the skin theme (`plugins/`, `themes/`), rewind checkpoints (`file-history/`). The README gives the exact command.
  4. Keep `~/.claude.old` until a week of use shows nothing is missing.

  Leaving `skills/` behind is what removes the 23 AWS skills and the other third-party ones. A project that needs one installs it in its own `.claude/skills/`.

- **Outside `~/.claude`, untouched by the swap:**
  - `~/.claude.json` holds the MCP servers and per-project state. `context7` stays (CLAUDE.md relies on it). `aws-mcp` fails to connect in every session; remove it with `claude mcp remove aws-mcp -s user` unless you use it.
  - Skills synced from your claude.ai account (`anthropic-skills:docx`, `pdf`, `pptx`, `xlsx`, `deep-research` and others) and plugins (`skin`, `figma`) keep loading. They are managed in claude.ai settings and `/plugin`, not in this repo.
- **settings.json:** Claude Code writes to this file itself (`/model`, `/config`, effort), so those changes show up as git diffs. Commit them or discard them.
- **RTK.md:** not in the repo. CLAUDE.md no longer imports it (see 5.1). If an `rtk` update re-creates it or re-adds the `@RTK.md` import, that is a known diff to discard.

## 5. Always-loaded files

### 5.1 CLAUDE.md (target ~45 lines)

Sections and their content, close to final wording:

**Writing**

- Never use the em dash in anything you write: code, docs, commit messages or replies. Use a hyphen, comma, colon or parentheses instead. Leave existing ones in text you aren't editing.

**Building**

- Optimize for quality, robustness and long-term maintainability, not speed of delivery.
- Never hand-edit generated files (lockfiles, CHANGELOG, codegen output) or migrations already applied. Change the source and regenerate, or add a new migration.
- Before using a library's API, check the installed version in the lockfile. Use context7 when that version is newer than what you know or when an API call fails unexpectedly.
- Ask when a wrong guess about requirements, types or behaviour would be costly to undo. Otherwise follow the codebase and state the assumption. Say "I don't know" or "I need to check X" instead of guessing.

**How to work**

- Tiny changes (typo, config value, dependency bump): just do it, no test, say so.
- Any behaviour change in a repo with a test setup follows the `writing-tests-first` skill. A bug fix always starts with a failing test that reproduces it. No test setup: ask before adding one.
- Non-trivial changes (several files, a design choice, or more than one PR worth): a short plan and my go-ahead before writing code, or suggest `/workflow new`.
- Scratch files and scripts go in the session scratchpad, never in the repo.

**Scope**

- Change what the task needs. Small, obvious issues in the files you're already changing can be fixed along the way; list anything else at the end instead of fixing it.

**Verification**

- Before saying a task is done, run the project's lint, typecheck and tests (commands in the project CLAUDE.md or `.claude/workflow.json`). Never ignore a failure or a flaky test: fix it if your change caused it, report it if not.
- Exercise the real thing when possible: the route against the running app, the screen in a browser.

**Report**

- End every task with: what was done, what was not and why, what could not be verified, every test changed and why, assumptions made, issues noticed outside the scope.

**Safety**

- Never print, log, commit or paste secret values (.env, kubeconfigs, tokens, Terraform state). Refer to them by name.
- Never `git add`, commit or push unless I ask. A workflow started with commits enabled counts as asking for that workflow's slice commits. Never force-push, push to the default branch or deploy unless I name that action.
- Uncommitted work may be the only copy. Ask before anything that discards it (reset, checkout, restore, clean, stash, switching branches, `rm -rf`, dropping a local database).
- Before any infra command, confirm the kube context, cloud profile and Terraform workspace, and run `plan`, `diff` or `--dry-run` first. Ask before changing shared or production state. Local targets are fine.

**Tools**

- Shell commands are rewritten through `rtk` by a hook to shorten output. When filtered output hides something you need, run `rtk proxy <cmd>`.

Removed from the previous version:

- The comment rule, now in `rules/code.md` and `writing-clean-code`.
- The bug reproduction rule, now in `writing-tests-first`, which resolves the old E2E vs lowest-level conflict.
- The `@RTK.md` import, now the 2 lines under Tools.

### 5.2 settings.json

Kept from the current file: `model`, `effortLevel`, `modelSettings`, `theme`, `tui`, `env`, `enabledPlugins`, `extraKnownMarketplaces`, and `attribution` with empty `commit` and `pr`, which already removes the Co-Authored-By trailer.

**env:** adds `CLAUDE_CODE_PLUGIN_DIRS` = `~/.claude/mods/workflow:~/.claude/mods/house`. Removing this line turns both mods off.

**Permissions, deny:**

- Reading secrets with the Read tool: `.env`, `.env.local`, `.env.*.local`, `.env.production`, `.env.development`, `.env.staging`, `.env.test`. These are listed one by one so `.env.example` stays readable, because deny beats allow.
- `**/*.tfstate`, `**/*.tfstate.backup`, `~/.kube/config`, `~/.aws/credentials`, `~/.ssh/**`, `**/*.pem`, `**/*.key`.
- Editing the workflow state: `**/.git/claude-workflow/**`. Claude never needs to write there (the mod does), and through the sandbox merge this also blocks shell writes. It holds even if the mod is off.

**Permissions, ask:**

- Git: `git push` (all forms), `git reset --hard`, `git clean`, `git checkout --`, `git restore`, `git stash`, `git switch`, `git branch -D`.
- Files: `rm -rf`.
- Terraform: `apply`, `destroy`, `import`, `state`.
- kubectl: `apply`, `delete`, `edit`, `patch`, `scale`, `rollout`.
- Helm: `install`, `upgrade`, `uninstall`, `rollback`.
- Docker: `docker system prune`, `docker volume rm`.
- Publishing: `gh pr merge`, `gh release`, `npm publish`, `pnpm publish`, `cargo publish`.
- Databases: `dropdb`.

Every Bash rule is written twice, plain and prefixed with `rtk`. Rules are matched after `rtk` rewrites the command, so `Bash(git push:*)` alone lets `git push` through (measured in M0, section 15). `rtk` rewrites `git push`, `git checkout`, `git stash`, `git branch`, `kubectl apply`, `helm upgrade`, `gh pr merge`, `gh release`, and turns `cat .env` into `rtk read .env`.

An ask rule still prompts you in auto mode (measured in M0). Prefix rules miss some forms (`git -C dir push`), which `house` catches (section 11).

**Permissions, allow:**

- Read-only git, the usual test and lint runners.
- The current one-off entries (`python3 -c ...`, `mvn`, `echo`, `export JAVA_HOME`) are removed.

**Sandbox:**

- Enabled.
- `excludedCommands`: `kubectl`, `terraform`, `helm`, `aws`, `gcloud`, `docker`. These run outside it, because they need credentials or the Docker socket; the ask rules above gate them.
- Network `allowedDomains` starts with the package registries (npm, PyPI, crates.io, the Go proxy) and GitHub, then grows as prompts show what is missing.
- Claude can ask to run one command outside the sandbox, which would also skip the deny rules merged into it. `house` turns every such request into a person-only ask.

**Hooks:** only `PreToolUse` on Bash: `rtk hook claude` (kept). Everything else is in the mods.

## 6. Rules

Not one rule per language. A language rule exists only for opinions Claude would not apply unprompted, or for corrections that repeat (added by the retro phase). Error-handling idioms differ by language, so they are covered once in `code.md`.

| File              | `paths`                                                                                                                                         | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code.md`         | Source extensions: ts, tsx, js, jsx, mjs, cjs, py, go, rs, c, h, lua, sh                                                                        | Follow `writing-clean-code` for anything beyond a one-liner. **Comments:** none by default. Only 4 cases: why plus the rejected alternative, an external constraint, a deliberate duplication, a toolchain directive with its reason. Delete comments that restate code you are changing; keep and flag any you cannot judge. **Errors:** use the language's and codebase's logging and idiom (exceptions in TS and Python, error values in Go, `Result` in Rust, return codes in C), never swallow, never fall back to a permissive default. No TODO or FIXME: do it or report it |
| `tests.md`        | `**/*.{test,spec}.*`, `**/__tests__/**`, `**/tests/**`, `**/test/**`, `**/spec/**`, `**/e2e/**`, `**/*_test.go`, `**/test_*.py`, `**/*_test.py` | The test is the spec. Never weaken a test to get green: no removed assertion, skip, `.only`, widened matcher or unread snapshot update. Never adjust an expectation to match the output. A test passing on its first run is investigated. Never special-case the implementation for a test. If a test looks wrong: stop, explain with evidence, and ask (unlocking needs my approval). Table-driven tests are fine. No `sleep`: wait on an observable condition                                                                                                                  |
| `typescript.md`   | ts, tsx, mts, cts, js, jsx, mjs, cjs                                                                                                            | Strict mode. No `any`, no cast or `!` to silence the compiler: use `unknown` and narrow. Parse at the boundary with the codebase's validator (zod, class-validator in NestJS); types come from the schema (`z.infer`), never declared beside it. Discriminated unions over bags of optional fields. No floating promises; `async` only when it awaits. `import type` for types                                                                                                                                                                                                     |
| `frontend.md`     | tsx, jsx, vue, svelte, html, css, scss                                                                                                          | **Kept:** look at the result in a browser at mobile and desktop widths, and be picky about what you see. **Added:** reuse the project's components and design tokens before writing new ones; Tailwind arbitrary values only when no token fits; semantic HTML; keyboard and focus states                                                                                                                                                                                                                                                                                          |
| `infra.md`        | Dockerfile, compose files, `.github/workflows/**`, `**/*.tf`, charts, k8s manifests                                                             | Load `changing-infrastructure` before plan, apply or deploy. **Images:** pinned versions (a digest for production), non-root, multi-stage, lockfile installs (`npm ci`), no secrets in layers or build args. **CI:** actions pinned to a SHA, least-privilege `permissions`. **Kubernetes:** requests and limits, probes, `securityContext`, never `latest`. **Terraform:** remote state with locking, no hardcoded credentials                                                                                                                                                    |
| `claude-setup.md` | `**/skills/**/*.md`, `**/agents/*.md`, `**/rules/*.md`, `**/mods/**`, `**/CLAUDE.md`, `**/.claude/settings*.json`                               | Load `editing-claude-setup`. **House style:** gerund skill names; trigger phrases first in the description, under ~400 characters; explain why instead of writing in capitals; references one level deep; generic global skill plus project overlay; no em dash                                                                                                                                                                                                                                                                                                                    |

Known limit: Rust unit tests inside a source file (`#[cfg(test)] mod tests {}`) cannot be told apart from code by path. In a workflow, Rust tests go in `tests/` or in a separate `tests.rs` module file.

## 7. Knowledge skills

All are model-invocable, with descriptions under ~400 characters. Each one is ported from `samples/reference-skills` with ZeBuilder specifics removed (repo names, invariants, commands, reviewers, backlog ids, `core:*` cross-references, references to rules from the ZeBuilder root CLAUDE.md).

### writing-tests-first

- **Kept:**
  - the loop;
  - the non-negotiables;
  - what to test and where;
  - the test-double policy, including "treat your own urge to mock as suspect";
  - the abuse-case rule, generalized to "another user's or tenant's id";
  - when the test can't come first;
  - rules deliberately not followed.
- **Added:**
  - **Test levels by project size**, decided once per project in the design phase:

    | Project                        | Unit  | Integration                                | E2E                                | Abuse cases                                 |
    | ------------------------------ | ----- | ------------------------------------------ | ---------------------------------- | ------------------------------------------- |
    | Solo tool or script, no users  | Logic | Only where the database or IO is the point | None                               | Only on untrusted input                     |
    | Personal app, deployed         | Logic | API and database                           | One smoke test of the main journey | Auth and every route taking input           |
    | Multi-user, team or production | Logic | Real database and everything it enforces   | One per key journey                | One per positive case on sensitive surfaces |

    What raises the level: auth, several users, untrusted input, money or personal data, public deployment. Security tests are these abuse cases, not a separate suite.

  - **Two modes.** Outside a workflow, one test at a time. Inside a workflow, a slice's tests are written together, then locked (section 9).
  - **Frozen tests.** Once red for the right reason, a test does not change until green.
  - **No special-casing** of the implementation for a test.
  - **The way out.** If stuck after real attempts or a test seems wrong, stop and report with evidence.
  - **Show the red output** before implementing.
  - **Table-driven tests are fine**, which fixes the old contradiction with the role-matrix loop.
  - **Bugs:** the reproduction is the first test, at the lowest level that shows the bug as a user sees it.
- **Clarified:** in small tasks the case list is stated and work proceeds; in a workflow the cases come from the approved `slices.md`.
- **References:**
  - `hard-cases.md` (generic version of tdd-when-it-is-hard);
  - `abuse-cases.md` (generic version of security-cases);
  - `evidence.md` (unchanged, for humans arguing about a rule).

### writing-clean-code (~80 lines)

- **Kept:**
  - the comment policy with the 4 cases and the deletion rules;
  - opinionated naming points (product vocabulary, one word per concept, predicates for booleans);
  - functions: no flag parameters, command or query, no surprises, pure core with IO at the edges;
  - types: parse at the boundary, no casts, illegal states unrepresentable;
  - errors: never swallow, no fallback on failure, in the codebase's idiom;
  - rule of three, and no speculative generality;
  - smallest change, no pass-through wrappers;
  - how tests read;
  - before calling it done;
  - rules deliberately not followed.
- **Dropped:** `design-and-structure.md` (textbook material Claude applies anyway) and the generic naming and function-size advice.
- **Reference:** `cleaning-up.md` (structural vs behavioural changes kept apart, the comment audit, characterization tests before touching untested code, when not to clean).

### writing-secure-code

- **Kept:**
  - the 5 rules: authorization on the server from the signed token, fail closed, secrets never leave their process, untrusted input parsed before any sink, dependencies verified before they are added;
  - the dependency check, against hallucinated and typosquatted names;
  - what errors and logs may carry;
  - never disable a check to finish;
  - the trigger table that decides when the reviewer applies its security lens.
- **Dropped:** the ownership table, the G01 to G35 guardrails, ZeBuilder exceptions to failing closed (replaced by "exceptions documented in the project").
- **References:**
  - `agent-risks.md`: the measured patterns and the two habits (iteration degrades security; the author agrees with itself);
  - `owasp.md`, about 40 lines: the 2025 Top 10 in one line each, the API Top 10 names (BOLA, BOPLA, BFLA, unrestricted resource consumption), A10 failing open, ASVS 5.0 as the requirement-level reference, and the table of current editions so no edition gets invented.
- **Per-project, per-stack overlays** (sinks for that language and framework) live in the project's `.claude/skills/`.

### following-git-conventions

- **Kept:** the 11 keywords as a compact list with the pitfalls; branch format; header format with scope rules, 72 characters, imperative mood, no emoji or dash; the body explains why; one logical change per commit; squash fixups; reverting; the PR checklist, title and body template; the size signal of about 500 lines or 10 files and asking before splitting.
- **Moved:** reviewers and backlog ids are read from the project CLAUDE.md, otherwise Claude asks.
- **Dropped:** the Co-Authored-By line (already enforced by `attribution`).
- **Reference:** `stacked-prs.md` kept almost as is: `gh stack` is recent, and the table of commands that hang in a terminal is exactly what Claude would not know. The org is read from `gh repo view`.

### writing-github-issues

Kept almost entirely: ask before drafting, never fill a gap with a guess, scope and splitting, parent and sub-issues, level of precision, skeleton, checklist, and the `sub_issues` `-F` integer gotcha word for word.

Changes:

- The repo comes from `gh repo view`.
- Assignees: Claude asks, offering the org members from `gh api`.

### writing-readmes

- Kept: the rules and the checklist.
- Changes: "Role in ZeBuilder" becomes an optional "Role in the system". Links to sibling repos use their GitHub URLs from `gh repo view`.

### changing-database-schema (new)

`paths`: `**/migrations/**`, `**/*.prisma`, `**/*.sql`, `**/alembic/**`.

Content:

- Expand first, contract in a later release.
- Never edit an applied migration.
- Backfill separately from the schema change.
- Changes that avoid long locks on large tables: concurrent indexes, nullable first, default without rewrite.
- Every migration has a test of what it promises (a constraint, a policy, a cascade) against a real database.
- A rollback plan.
- Know the migration tool's dev vs deploy commands (Prisma, TypeORM, Alembic, golang-migrate, sqlx).

### changing-infrastructure (new)

- Confirm the context first: kube context, cloud profile, Terraform workspace, Helm release and namespace.
- Read before writing: `plan`, `diff`, `--dry-run=server`, `helm diff`, then summarize the change in a few lines (what is created, changed, destroyed).
- Ask before touching anything shared or in production.
- State locking and drift.
- Never print secrets; refer to them by name.
- Every change has a rollback path.
- Local targets (kind, minikube, compose) are fine without asking.

### editing-claude-setup (new)

See section 13.

## 8. The workflow

### 8.1 Sizes

| Size            | Example                               | Path                                                                                            |
| --------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Tiny            | Typo, config value, dependency bump   | Just ask                                                                                        |
| Small           | Bug fix, one-slice feature            | Plain session: CLAUDE.md triggers `writing-tests-first`, plan mode if there is a design choice  |
| Feature         | Several slices in an existing project | `/workflow new` with the feature size: design (with a short spec inside), slice, build, inspect |
| Project or epic | New product, large feature            | `/workflow new` with the project size: spec, design, slice, build, inspect, retro               |

### 8.2 Who does what

The `workflow` mod is the engine: it decides what happens next, keeps the state, enforces locks and gates, and shows where you are. Claude is the worker: it does the phase's work from the instructions the mod hands it. Anything that has one right answer is code; anything that needs judgment is markdown read by Claude.

| The mod (code, no tokens)                                       | Claude (markdown, tokens)                                   |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| Finds the workflow from the branch, reads and writes its state  | Asks the questions, writes the spec, design and slices      |
| Picks the phase file and the slice, composes Claude's prompt    | Writes the contract, tests and code                         |
| Collects drift facts after a long break (git, lockfiles, age)   | Runs the commands the mod gives, in the sandbox             |
| Locks tests, checks red and green, restores tampered tests      | Reads failures and fixes the right side                     |
| Raises the gate and unlock dialogs that only you can answer     | Writes the handoff, summarizes drift, proposes retro edits |
| Status line, session start notice, list of all workflows        |                                                             |

### 8.3 One command: `/workflow`

Registered by the mod, so it costs no context in sessions that don't use it. Plain words ("continue the auth workflow") no longer start it: `/workflow` is the entry point.

| Invocation                                          | Who                  | Does                                                                                                                                                                                                                            |
| --------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/workflow`                                         | Mod only             | Status: every workflow of this repo with phase, slice, last update, and which one is bound to the current branch                                                                                                                |
| `/workflow all`                                     | Mod only             | Every open workflow on this machine, from the mod's store: project folder, slug, phase, age. For finding what you left open months ago                                                                                          |
| `/workflow new <title>`                             | Mod, then Claude     | The mod creates the state. Claude proposes the size, slug, branch, whether to commit after each slice, and a worktree if another workflow already uses this checkout, then starts the first phase                              |
| `/workflow continue [slug]`                         | Mod, then Claude     | The mod picks the workflow (the one on the current branch, or the only open one, otherwise it lists them), collects drift facts if it has been a while, and starts Claude on the next step with exactly what that step needs |
| `/workflow next`                                    | Mod, then Claude     | Clears the context, then continues. The per-slice loop in one command                                                                                                                                                           |
| `/workflow pause`                                   | Mod, then Claude     | Claude writes the handoff through the mod: where things stopped, the next concrete action, open questions                                                                                                                       |
| `/workflow unlock <file> <reason>`                  | Mod only             | You unlock a locked test yourself. Typed by you, so it is your approval                                                                                                                                                          |
| `/workflow done <slug>`, `/workflow abandon <slug>` | Mod only             | Closes a workflow and records why. `done` offers the retro first when the size has one                                                                                                                                          |
| `/workflow adopt`                                   | Mod, then Claude     | For a project with no setup: the setup phase reads README, docs, git log and branches, and proposes the project CLAUDE.md, `workflow.json` and a state for any work in progress                                                |

**Tools Claude calls.** The mod registers them only in repos that have a workflow, so other sessions never see them:

| Tool                           | Does                                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `mcp__workflow__handoff`       | Saves where things stopped, the next action and open questions into the state                                              |
| `mcp__workflow__advance`       | Asks to pass a gate. The mod asks you in Claude Code's question dialog, which Claude and auto mode cannot answer, then moves the phase forward |
| `mcp__workflow__lock`          | Locks the slice's tests after checking they failed (section 9)                                                             |
| `mcp__workflow__verify`        | Checks the slice is green and the lock intact, then closes the slice                                                       |
| `mcp__workflow__unlock`        | Asks to unlock a test, with the reason. Same dialog as `advance`                                                           |

### 8.4 State: the uncommitted project memory

**Location:** `<git common dir>/claude-workflow/`, that is, `.git/claude-workflow/` in a normal checkout.

- It is never committed, and no `.gitignore` change is needed.
- It is shared by every worktree of the repo, which multiple workflows need: untracked files in `.claude/` would exist separately in each worktree.
- It moves with the project folder.
- Only the mod writes it. Claude reads what the mod puts in its prompt and changes the handoff through `mcp__workflow__handoff`. A deny rule keeps Claude's tools and shell out of the folder (5.2), so a bad edit cannot corrupt a state or a lock.
- On a fresh clone it is gone, but the committed docs (`slices.md` checkboxes) are the source of truth and `/workflow adopt` rebuilds it.
- A workflow needs a git repo: `/workflow new` outside one offers `git init`.

```text
.git/claude-workflow/
├── <slug>.md            one per workflow
└── locks/<slug>.json    test lock
```

**`<slug>.md` format:** YAML frontmatter with flat keys, followed by short sections, so you can read it too. It is kept under ~60 lines; the log is trimmed to the last 10 entries.

- **Frontmatter:** `slug`, `title`, `size`, `phase` (setup, spec, design, slice, build, inspect, retro, done), `status` (active, paused, done, abandoned), `branch`, `worktree`, `slice`, `commits` (yes or no), `auto_next` (yes or no), `paths` (the folders the design touches, for the drift check), `updated`.
- **Body sections:** Goal (one line), Docs (links), Where we stopped, Next action (one concrete step), Open questions, Log (dated one-liners: phase moves, locks, unlocks with their reason, slices closed).

**The mod's store** (global, in `~/.claude`) keeps only an index: project folder, slug, phase and date of each open workflow, for `/workflow all`.

### 8.5 Several workflows at once

- **One workflow, one branch, one slug.** Its documents are in `docs/specs/<slug>/`, its state in `<slug>.md`, its lock in `locks/<slug>.json`.
- **One checkout runs one workflow at a time.** Parallel work uses `git worktree add ../<repo>-<slug> <branch>`, offered by `/workflow new`. Start the second session in that folder; the state is shared, so `/workflow` lists everything from any worktree.
- **One session per workflow.** The mod records which session holds a workflow and warns when another session continues it.
- **ADRs are named `docs/adr/YYYY-MM-DD-<title>.md`**, not numbered, so two branches never collide on `0007`.
- **The mod finds the active workflow from the current branch**, so its guards always apply the lock of the workflow you are on, and the status line shows it.

### 8.6 Resuming after a long time

When a session starts in a repo with open workflows, the mod shows a notice (slug, phase, slice, age) and puts the current one in the status line. Nothing goes into Claude's context until you type a command.

`/workflow continue` runs the drift check when the state is more than 14 days old or the branch is behind the default branch:

1. The mod collects the facts: commits on the default branch since `updated` in the workflow's `paths`, lockfile changes, the age.
2. Claude runs the project checks once (in the sandbox) to see whether the baseline is still green.
3. Claude writes a summary of at most 10 lines with what it means for the next slice, following `guides/drift-check.md`, and offers a rebase (with your approval).

The prompt holds only what the next step needs: the state, the current slice and the design sections it names, not every document.

### 8.7 The phases

Each phase file starts with frontmatter the mod reads: the files the phase may write (`writes`) and what it needs loaded (`reads`). During a phase, the mod denies Edit and Write outside its `writes` globs, so the spec phase cannot start coding.

| Phase   | Reads                                                                   | Does                                                                                                                                                                                                                                  | Writes                                                                                                                                                                                                                                                               | Gate                                             |
| ------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| setup   | Manifests, CI config, existing tests, README                            | Detects the stack, commands and test layout; runs each command once to prove it works                                                                                                                                                 | Project `CLAUDE.md` (commands, a 5-line architecture with links, invariants, test level, conventions), `.claude/workflow.json`, project `.claude/settings.json` (allow rules for its commands, sandbox exceptions)                                                   | You approve the files                            |
| spec    | Your idea, an issue, existing docs                                      | Restates the problem, asks in batches with AskUserQuestion using `guides/product-questions.md`, never fills a gap with a guess                                                                                                        | `docs/specs/<slug>/spec.md`: problem, users and roles, goals, non-goals, user stories, acceptance criteria in EARS format (`guides/ears.md`), negative and abuse cases, constraints, success measures, decisions taken                                               | You approve; no open question left               |
| design  | Approved spec (or the issue for a feature), the codebase                | Technical questions (`guides/technical-questions.md`), lists the drivers, proposes 2 or 3 options with a trade-off table and a recommendation (`guides/decision-guide.md`). Verifies new packages and versions. Runs setup if missing | `design.md`: drivers, options, decision, components, data model, API contracts, key flows as diagrams, security model (trust boundaries, authorization rule), test level and strategy, observability, rollout, risks. One ADR per decision that outlives the feature | You choose the option and approve                |
| slice   | Approved design                                                         | Cuts vertical slices. The first is a walking skeleton (thin end to end, CI included on a new project). Each fits the PR size signal. Optionally files GitHub issues (parent and sub-issues)                                           | `slices.md`: for each slice its goal, acceptance criteria, contract, test levels, sensitive-surface flag, the design sections it needs, dependencies, status checkbox                                                                                               | You approve the slices and criteria              |
| build   | The current slice, the design sections it names                         | The slice cycle (8.8)                                                                                                                                                                                                                 | Code, tests, the slice checkbox, a commit if enabled                                                                                                                                                                                                                 | Automatic: `verify` passed, self-check passed    |
| inspect | The whole branch, spec, slices                                          | Review (section 10), you choose what to fix, fixes go through the slice cycle (a bug found gets its failing test first), PR draft through `following-git-conventions`                                                                 | Fixes, PR draft                                                                                                                                                                                                                                                      | You approve the push and PR                      |
| retro   | Review findings, corrections you made, unlock events, stuck slices      | Each repeated pattern becomes a proposal: a rule line, a skill edit, a project skill, or nothing. Marks where the build departed from `design.md`                                                                                     | Approved edits; global ones are committed in `~/.claude` only on your request                                                                                                                                                                                        | You approve each item                            |

Every gate except build goes through `mcp__workflow__advance`: Claude asks, you answer in the dialog, and only then does the phase move.

`decision-guide.md` is about how to choose, not a catalogue of patterns:

- Drivers first.
- Boring, known technology by default.
- When it is worth reaching for: services instead of a monolith, async processing, a document store, a cache, a queue, SSR vs SPA, managed vs self-hosted.
- Design it twice.
- Write down why the losing option lost.

### 8.8 The slice cycle (lean, one session)

1. **Load:** the mod's prompt holds the slice from `slices.md`, the design sections it names, and the exact test, lint and typecheck commands for it.
2. **Contract:** types, schemas, migration, and stubs that throw "not implemented". No behaviour, so the tests fail on assertions rather than on imports.
3. **Tests** for every acceptance criterion, at the levels the slice and the test level say, with abuse cases when the slice is flagged sensitive.
4. **Red, then lock:** Claude runs the given test command and reads each failure. An import or compile error is a broken test: fix it and run again. Then `mcp__workflow__lock`. The mod accepts only if it saw that exact command fail after the last test edit.
5. **Implement** until green: Claude runs the given commands for the slice, then the full suite.
6. **Exercise for real** when the slice has a runnable surface: built-in `/run`, the browser for UI, a real request for an API.
7. **Self-check:** each acceptance criterion maps to a passing test, plus the "before calling it done" lists of `writing-clean-code` and `writing-secure-code`. No agent here; the fresh-context review happens once per feature (section 10).
8. **Close:** `mcp__workflow__verify` checks that the mod saw the slice tests, lint, typecheck and full suite pass after the last code edit, and that the lock is intact. Then Claude ticks the slice in `slices.md`, writes the handoff, and commits if enabled.
9. **Next:** `/workflow next` clears the context and starts the next slice. With `auto_next` on, the mod does this itself after a verified close, and stops at any failure, gate or question.

**When stuck:** after 3 real attempts on a red test, or when a test looks wrong, stop and report with evidence. Unlocking a test is your decision.

## 9. Test lock: keeping tests and implementation apart

The earlier idea of separate test-writer and implementer agents is replaced by a lock. It gives the same separation, enforced by the mod, without 2 cold starts per slice.

**The mod never runs project code.** Tests run where Claude runs them, through Bash in the sandbox. The mod watches those calls and only accepts results of the exact commands it handed out. Running tests from the mod would put code Claude wrote outside the sandbox, since `$.process.run` is not sandboxed.

**Lock file `locks/<slug>.json`, written only by the mod:**

- The locked files with their hashes and a content snapshot: the slice's test files, plus the test config files listed in `workflow.json` (`testConfig`).
- The phase: `green` (tests locked, implementation in progress) or `open` (slice done, new tests may be added).
- The last observed runs: command, result, time.

**Layers:**

| Layer                                              | Stops                                                                                   | How                                                                                                                                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guard on Edit, Write and NotebookEdit              | Editing a locked file while the phase is `green`                                        | A `tool.call` deny with the reason and the way out. Fails closed if the mod errors                                                                                                       |
| Check after every Bash call                        | Changing tests through the shell                                                        | The mod re-hashes the locked files after each command. A changed file is restored from the snapshot at once, and Claude is told why                                                       |
| Observed runs                                      | Claiming red or green without running, or running a narrower command                    | `lock` and `verify` accept only the exact commands the mod gave, seen through `tool.call`, after the last relevant edit                                                                   |
| Test config in the lock                            | Excluding tests through config (ignore patterns, `addopts`, a test filter)              | The files in `testConfig` are locked with the tests                                                                                                                                       |
| `lock` on the next slice                           | Weakening earlier tests while the phase is `open`                                       | Additions to locked files are allowed. Removed or changed lines (import lines excepted) are refused until unlocked                                                                        |
| Deny rule on `.git/claude-workflow/` plus sandbox  | Tampering with a state or a lock                                                        | Claude's tools and shell cannot write there (measured in M0); the mod writes with its own file access. Holds even if the mod is off. Running outside the sandbox needs your approval (`house`), and the mod keeps each lock's hash in its store, so a lock changed by anything else is refused |
| Unlock is yours                                    | Claude unlocking on its own                                                             | `mcp__workflow__unlock` asks you in Claude Code's question dialog, auto mode included, or you type `/workflow unlock`. A dismissed dialog refuses. The reason goes into the state log and feeds the retro |
| `house` test integrity, every session              | Skip or `.only` added, assertions deleted, snapshots rewritten, existing tests modified | Each Edit or Write to a test file is checked as it happens, with a note to Claude. At the end of a turn, the git diff on the test globs catches shell changes and queues one follow-up asking to revert or explain |
| `rules/tests.md` and `writing-tests-first`         | Special-casing the implementation, adjusting an expectation to the output               | Prose, with the way out, because cheating mostly happens when there is no legitimate exit                                                                                                 |

**Project config `.claude/workflow.json` (committed):**

- `testGlobs`;
- `testConfig`: the files that decide which tests run (`vitest.config.*`, `jest.config.*`, `pytest.ini`, `pyproject.toml`, `Cargo.toml`, ...);
- `commands`: `test`, `testFiles` with a `{files}` placeholder, `lint`, `typecheck`, `format`, `e2e`;
- `testLevel`;
- `specsDir` (default `docs/specs`);
- optional `packages` entries with their own globs and commands, for monorepos.

The mod cannot read prose, so this is the one machine-readable file. It is what makes the same guards work in TypeScript, Python, Go, Rust, C and Lua.

## 10. Review

Once per feature, in the inspect phase. The reasons for a separate context: an author agrees with its own code, and security degrades across rounds of iteration.

1. **`reviewer` agent** in a fresh context, with the base ref, the spec and slices paths, and the lenses to apply:
   - **Spec:** every acceptance criterion has a test that asserts behaviour (not a call on a mock); no weakened test; nothing out of scope.
   - **Quality:** the `writing-clean-code` checklist.
   - **Security:** when the `writing-secure-code` trigger table says so.

   Returns findings: severity (blocker, major, minor), `file:line`, the rule broken, evidence, and a direction for the fix. It never edits.

2. **Built-in `/code-review`** for correctness bugs, at low or medium level on Pro.
3. **Built-in `/security-review`**, only for auth, payments or a public release: a low-noise second pass looking for exploitable vulnerabilities.
4. Findings are merged, deduplicated and sorted. You pick what gets fixed.

## 11. Mods, settings hook and agent

| Piece                 | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mods/workflow`       | The `/workflow` command (8.3). The 5 tools, registered only in repos with a workflow. Guards: phase write scope, test lock, post-Bash re-hash. Status line entry and session start notice. Drift facts. The store index for `/workflow all`                                                                                                                                                                         |
| `mods/house`          | **Typography:** denies a Write or Edit that adds an em dash (existing ones in the replaced text don't count), and a `git commit` or `gh pr\|issue create` whose message or body has one. Rewrites em dashes in Claude's replies to a spaced hyphen before they are stored: the one place no settings hook could reach. Only what Claude writes is checked: tool output (rtk prints em dashes) is left alone. **Safety asks:** a person-only ask, which auto mode cannot approve, for the commands of the 5.2 ask list, matched with or without `rtk`, in any `&&` or `;` segment, and in forms prefix rules miss (`git -C dir push`); and for any command Claude wants to run outside the sandbox. **Test integrity:** section 9 |
| Settings hook         | `rtk hook claude` on Bash, unchanged                                                                                                                                                                                                                                                                                                                                                                              |
| `agents/reviewer.md`  | The inspect phase. **Tools:** Read, Grep, Glob, Bash; Edit, Write and Agent disallowed. **Model:** inherits; effort high. **Loading:** preloads `writing-clean-code`, and reads the `writing-tests-first` and `writing-secure-code` checklists when their lens is on                                                                                                                                              |

Both mods are TypeScript, the language of the mod API, which replaces the Python hooks and `wf` of revision 1. Every guard has a `.catch` that refuses, so a mod error blocks the action instead of letting it through.

## 12. Token budget

What costs on a subscription:

- **Every turn sends the whole context again**, so long sessions cost more for each turn.
- **Every agent is a cold start** that re-reads instructions, docs and code before doing anything.
- **Verbose command output**, already reduced by `rtk`.
- **High effort**, which spends more on thinking.

Choices made because of it:

- **No agents inside the slice cycle.** The first design had 4 to 5 cold starts per slice. Now: zero per slice, one reviewer per feature.
- **The mod does the bookkeeping for free.** `/workflow`, `/workflow all`, `done`, `abandon`, `unlock`, the status line and the session notice run no model turn. For the other commands the mod composes the prompt, so Claude spends no turns finding the state, choosing a phase or reading whole documents.
- **Nothing workflow-related is always loaded.** No skill description, and the tools exist only in repos with a workflow.
- **One slice per run.** `/workflow next` clears and continues in one command; the state on disk makes the fresh session free to resume.
- **Little is always loaded:** CLAUDE.md about 45 lines, and the 9 knowledge skill descriptions of about 400 characters each.
- **Skills from outside the repo** still load: Anthropic's built-in ones, the ones synced from your claude.ai account, and plugin ones (skin, figma). Disable what you don't use in claude.ai settings and `/plugin`.

Model and effort, as guidance in `docs/workflow.md`:

- **spec, design, slice, inspect:** short and reasoning-heavy. Opus, effort high; xhigh only for a hard design call.
- **build:** well specified by then. Sonnet, or Opus at medium effort.
- **Default effort:** xhigh drains a Pro quota fastest. High as the default is the better trade.

## 13. Documentation and editing the setup with Claude

**Docs in the repo:**

| File                   | For                                                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`            | What the setup is, installation (new machine, replacing an existing `~/.claude`), the daily commands, links to the docs                                              |
| `docs/architecture.md` | The mechanisms and why each instruction lives where it does (section 3 of this plan), the enforcement layers, the file map                                           |
| `docs/workflow.md`     | User guide: sizes, `/workflow` subcommands, the phases, the slice cycle, unlocking a test, several workflows, resuming, model and effort advice, and manual mode     |
| `docs/editing.md`      | How to change the setup by hand or with Claude: where to put a new instruction, how to change a mod, how to test, how to reload, what to check after an update      |
| `docs/decisions.md`    | Dated one-line entries: what was decided and why (for example "test lock instead of split agents: token cost on Pro")                                                |

**Manual mode**, for when the mod API breaks after a Claude Code update: remove `CLAUDE_CODE_PLUGIN_DIRS` from `settings.json` and tell Claude "read `.git/claude-workflow/<slug>.md` and `~/.claude/mods/workflow/phases/<phase>.md`, then continue". The deny rule, the rules and the skills still hold; the lock and the gates do not.

**`editing-claude-setup` skill**, loaded by `rules/claude-setup.md` or by its description when you ask Claude to change the setup:

- A decision table for where an instruction goes:
  - always relevant: CLAUDE.md;
  - tied to a file type: a rule;
  - a procedure or knowledge: a skill;
  - a manual command with no logic: a skill with `disable-model-invocation`;
  - needs a fresh context: an agent;
  - needs logic, state, or a guard that depends on state: a mod (`house` if it applies everywhere, its own mod if it is a new area);
  - must hold even if a mod fails: a permission or sandbox entry.
- For mods: the API types are written beside each loaded mod in `.claude-plugin/types/`; grep them for the event or method at hand. The API is early access, so check the types rather than memory.
- The house style.
- Description budget and trigger phrases.
- Skills are tested with `skill-creator` evals; mods with `claude plugin validate` and `claude plugin test`.
- What to update after a change: the docs, `decisions.md`.
- Rules, skills and CLAUDE.md are picked up in a new session; mods reload when their files change.
- Commits follow `following-git-conventions`, and only on your request.

## 14. Tests for the setup itself

The mods are the enforcement layer, so they get tests too:

- `mods/<name>/tests/*.test.ts`, run with `claude plugin test mods/<name>`. Before each commit to the setup: `claude plugin validate` and `claude plugin test` on both mods.
- The test answers the mod's file reads and `git` calls, so each case describes a small repo: a test file, a lock, a branch bound to a workflow.
- Cases:
  - the guard denies a locked file in the `green` phase and allows it in `open`;
  - a Bash command that changes a locked file gets it restored;
  - `lock` refuses without an observed failing run of the exact command, and refuses removed lines in locked files;
  - `verify` refuses a green run made before the last code edit, or of a narrower command;
  - `unlock` and `advance` change nothing unless the dialog's answer is exactly the approving label; a dismissed dialog refuses;
  - a phase denies writes outside its `writes` globs;
  - `/workflow` picks the workflow from the branch and lists several;
  - test integrity flags `.skip`, `.only`, `xit`, `pytest.mark.skip`, `t.Skip` and deleted assertions, and queues only one follow-up;
  - typography denies an added em dash, ignores existing ones, and rewrites one in a reply;
  - safety asks answer `ask` for `git push`, `rtk git push`, `cd x && git push`, `git -C x push`, and a command outside the sandbox, and stay out of the way for `git status`;
  - the session notice stays silent without workflows.
- A manual end-to-end checklist in a scratch repo (in `docs/editing.md`), run after each Claude Code update, since the API may change.

## 15. To verify on this machine before building

Run in M0 with a throwaway probe mod, headless sessions on Haiku in a scratch repo, and `rtk` 0.51.0.

| #   | Question                                                                                                  | Result                                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Do permission rules match the command before or after `rtk` rewrites it?                                  | **After.** A deny on `Bash(git push:*)` let `git push` through (the branch landed on the remote); a deny on `Bash(rtk git push:*)` blocked it. `rtk` adds no permission decision of its own. Every Bash rule is written in both forms (5.2). An ask rule in both forms prompted you in auto mode |
| 2   | Does `CLAUDE_CODE_PLUGIN_DIRS` load the mods?                                                             | **Yes** from the process environment, with no question. The `env` block of `settings.json`, `~` expansion and hot reload are checked at install (M1)                                                                         |
| 3   | Does the mod see the command before `rtk`, and a failure as `isError`?                                    | **Yes to both.** `tool.call` saw `git status`, not `rtk git status`; a failing rewritten command came back with `isError` and `Exit code 128`. `tool.check` sees it after: `rtk git -C . push`. `rtk` output can contain em dashes, so typography ignores tool output |
| 4   | Can a mod run `/clear`, then start a turn with `$.prompt.submit`?                                         | **Yes, from a timer.** The engine refuses a command run from inside a `command.run` hook; answering first, then running `/clear` and `$.prompt.submit` from `$.clock.after`, cleared the session and started the new turn     |
| 5   | Does a mod's approval reach you in auto mode?                                                             | **Yes, both ways.** `$.ui.ask` showed the question dialog and "Keep locked" refused the unlock. A `tool.check` ask on `git -C . push`, which prefix rules miss, prompted you. Not `tool.check` on a tool the mod serves itself: that tool skips the permission step |
| 6   | Does the `Edit` deny on `**/.git/claude-workflow/**` block sandboxed shell writes, and not the mod?       | **Yes.** The shell write failed with "operation not permitted" while other writes into `.git/` worked. The mod's `$.fs.write` succeeded and created the missing folder. A command run outside the sandbox would skip the rule, hence the `house` ask |
| 7   | Are rewritten replies stored and shown rewritten?                                                         | **Yes to both.** The stored reply had the marker replaced, and the terminal showed only the rewritten text, with no flash while streaming                                                                                    |
| 8   | Do `**/` globs in a user-level rule match files in any project?                                           | Checked at install (M1), when the first rules exist                                                                                                                                                                            |
| 9   | Does `rtk` re-add `@RTK.md` to CLAUDE.md on update?                                                       | Watched at the next `rtk` update                                                                                                                                                                                               |

Dropped since revision 1: writing into `.git/` with Edit (Claude no longer writes there), `wf` outside the sandbox (no `wf`), router `$ARGUMENTS` (no router skill), PostToolUse feedback (replaced by `tool.call`).

## 16. Build order

Each milestone gets used on real work before the next one starts.

| #   | Milestone           | Content                                                                                                                                                                                                                                      |
| --- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0  | Skeleton and checks | README, `.gitignore` whitelist, this plan, the `claude-workflow` repo skeleton, the verifications of section 15 with a throwaway mod                                                                                                         |
| M1  | Foundation          | CLAUDE.md, settings.json (permissions, sandbox, env), the 6 rules. Install on this machine (the swap)                                                                                                                                        |
| M2  | Knowledge skills    | `writing-tests-first` first, then the other 8 including `editing-claude-setup`, plus `docs/editing.md`                                                                                                                                       |
| M3  | `house` mod         | Typography and test integrity, with tests. Small on purpose: it proves the toolchain before the big mod                                                                                                                                      |
| M4  | Workflow core       | State, `/workflow` (status, all, new, continue, next, pause, unlock, done, abandon, adopt), the 5 tools, the lock and guards, status line and notice, the setup and build phases, tests. Pilot on a small real project at the feature size |
| M5  | Front phases        | spec, design, slice, with their guides, templates and `writes` scopes                                                                                                                                                                        |
| M6  | Back phases         | `reviewer` agent, inspect, retro                                                                                                                                                                                                             |
| M7  | Docs                | `architecture.md`, `workflow.md` and `decisions.md` finalized; this plan deleted                                                                                                                                                             |

## 17. Decisions

All taken with the proposed default on 2026-10-22.

| #   | Question                                                                    | Decision                                                                                                 |
| --- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | `docs/specs/` and `docs/adr/` committed to each project, or kept local?     | Committed: they are the project's memory, and the state can be rebuilt from them                         |
| 2   | Slices: you type `/workflow next`, or the mod chains them (`auto_next`)?    | You type it. `auto_next` is a per-workflow option for well-specified builds                              |
| 3   | Commit after each slice?                                                    | Asked once per workflow at `/workflow new`                                                               |
| 4   | Phase write scopes: deny, or only warn?                                     | Deny, with the reason and how to move on                                                                 |
| 5   | Em dashes in replies: rewrite them, or leave replies to CLAUDE.md?          | Rewrite to a spaced hyphen                                                                               |
| 6   | Build on an early-access API?                                               | Yes: gates, person-only unlock and the free bookkeeping need it, and manual mode is the fallback        |

## 18. Not now

- **Split mode:** test-writer and implementer as separate agents, for critical features where the extra cost is worth it. The lock covers the enforcement for now.
- **Rules per language** (Python, Go, Rust, C, Lua): only once the retro phase shows repeated corrections.
- **Parallel slices** in separate worktrees within one workflow.
- **A board pane:** every workflow and slice beside the chat, updated live. The status line covers the need for now.
- **A desktop notification** when Claude waits for input during a long run: a few lines in `house` once wanted.
- **Publishing `house`** as a plugin: it is personal. `workflow` is the shareable one.
