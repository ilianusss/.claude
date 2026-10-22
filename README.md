# ~/.claude

My Claude Code setup for fullstack and devops work. This repo is `~/.claude` itself.

**Status:** being built, milestone M0 of M7. [docs/plan.md](docs/plan.md) has the full design until the build is done.

## What is in it

| Path            | What                                                                                  |
| --------------- | ------------------------------------------------------------------------------------- |
| `CLAUDE.md`     | Instructions for every session                                                        |
| `settings.json` | Permissions, sandbox, the `rtk` hook, and the mods to load                            |
| `rules/`        | Guidance loaded when Claude touches a matching file type                              |
| `skills/`       | Knowledge Claude loads on demand: tests first, clean code, secure code, git, and more |
| `agents/`       | The reviewer, run in a fresh context                                                  |
| `mods/house`    | Rules for every session: no em dash, no weakened tests                                |
| `mods/workflow` | The `/workflow` command, a submodule: [claude-workflow](https://github.com/ilianusss/claude-workflow) |
| `docs/`         | How it works and how to change it                                                     |

Everything else in `~/.claude` is Claude Code's runtime data, ignored by git.

## Install

On a new machine:

```sh
git clone --recurse-submodules https://github.com/ilianusss/.claude.git ~/.claude
```

On a machine that already has a `~/.claude`, quit every Claude Code session, then replace the folder and bring back the runtime data (memory, transcripts, history, plugins, themes):

```sh
mv ~/.claude ~/.claude.old
git clone --recurse-submodules https://github.com/ilianusss/.claude.git ~/.claude
rsync -a --ignore-existing \
  --exclude /skills/ --exclude /CLAUDE.md --exclude /RTK.md \
  --exclude '/settings.json*' --exclude /dev-mods/ \
  ~/.claude.old/ ~/.claude/
```

Old skills are left behind on purpose. Keep `~/.claude.old` until a week of use shows nothing is missing.

Not in this repo, and untouched by the swap:

- MCP servers, in `~/.claude.json`: `claude mcp list` shows them.
- Skills and plugins from your claude.ai account and `/plugin`.

## Docs

- [docs/plan.md](docs/plan.md): the design, until it is split into the docs below.
- `docs/architecture.md`, `docs/workflow.md`, `docs/editing.md`, `docs/decisions.md`: written in milestone M7.
