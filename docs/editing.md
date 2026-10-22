# Editing the setup

How to change this setup, by hand or with Claude.

## With Claude

Ask in plain words ("add a rule that...", "the workflow should also..."). The `claude-setup` rule loads the `editing-claude-setup` skill whenever Claude touches a setup file, and the skill decides where the instruction goes, applies the house style and says how to test it. Run the session from `~/.claude` so the paths match.

## Where things go

| You want | Put it in |
| --- | --- |
| Something that must hold no matter what | A permission or sandbox entry in `settings.json` |
| A guard or behaviour that needs logic or state | A mod: `mods/house` (every session) or `mods/workflow` |
| An independent review in a fresh context | An agent in `agents/` |
| Knowledge or a procedure Claude picks up on its own | A skill in `skills/` |
| Guidance for one kind of file | A rule in `rules/` with `paths` |
| Something true in every session | `CLAUDE.md` (keep it short: it is loaded every time) |
| Something about one project | That project's `CLAUDE.md` or `.claude/` |

Every Bash permission rule is written twice, plain and with `rtk ` in front, because rules match the command after `rtk` rewrites it.

## Testing

| Changed | Run |
| --- | --- |
| A mod | `claude plugin validate mods/<name>` and `claude plugin test mods/<name>` |
| `settings.json` | `claude -p --model haiku --settings ~/.claude/settings.json "Reply OK"` from any scratch folder |
| A skill | The `skill-creator` skill's evals |

A mod's tests run against Claude Code's own engine, which also enforces how a mod is written: hooks are function literals, one hook per event without a matcher, and `$` only ever passed straight to a top-level function. A module that breaks one of these does not load, and the test output names the line.

Before committing a change to a mod, run both mods' tests:

```sh
claude plugin test ~/.claude/mods/house && claude plugin test ~/.claude/mods/workflow
```

## Reloading

- **Mods** reload by themselves when their files change, in a running session.
- **Rules, skills, agents, CLAUDE.md** are read when a session starts: start a new one, or `/clear`.
- **settings.json**: most keys apply to the running session; restart if in doubt.

## The workflow mod is its own repo

`mods/workflow` is a git submodule pointing at `ilianusss/claude-workflow`. To change it:

```sh
cd ~/.claude/mods/workflow
git switch -c <keyword>/<name>     # work and commit here
cd ~/.claude
git add mods/workflow              # then commit the new pointer
```

Push `claude-workflow` before `~/.claude`, or a fresh clone cannot find the commit the pointer names.

## After a Claude Code update

The mod API is early access and may change. After an update:

1. Run both mods' tests (above).
2. Start a session in a repo with a workflow: the status line shows `workflow: <slug>` and `/workflow` lists it.
3. If a mod is broken, turn mods off by removing `CLAUDE_CODE_PLUGIN_DIRS` from `settings.json`. The permissions, rules and skills keep working. Workflows continue by hand: tell Claude "read `.git/claude-workflow/<slug>.md` and `~/.claude/mods/workflow/phases/<phase>.md`, then continue". The test lock and the gates are off until the mod is fixed.
