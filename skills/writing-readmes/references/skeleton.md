# README skeleton

Every README has these H2 sections, in this order. Repo-specific sections go after Documentation, before License.

| # | Section | Required | Holds | Never holds |
| --- | --- | --- | --- | --- |
| 1 | H1 and one sentence | yes | The exact repo name, then one sentence on what it is | A tagline, a badge row, a pitch |
| 2 | `Role in the system` | no | When the repo is one of several: two or three sentences on what it does and which repos it talks to, each linked by URL | A product spec, an architecture diagram (link the doc) |
| 3 | `Prerequisites` | no | Tools and access needed before the first run, with minimum versions only | Pinned versions, optional tools |
| 4 | `Getting started` | yes | Numbered steps from clone to a running app, at most five, first-run commands verbatim | Day-to-day commands, troubleshooting, a second way to do the same |
| 5 | `Commands` | yes | One sentence and a link to where the commands are listed (CLAUDE.md, the manifest's scripts) | The command table itself, unless no other file lists them |
| 6 | `Project structure` | no | A one-level tree with the role of each top-level folder | File inventories, counts, nested trees |
| 7 | `Documentation` | yes | Where the rest lives: CLAUDE.md, `docs/`, ADRs | Copied content |
| 8 | Specific sections | no | Anything only this repo needs and no doc already owns | Content a doc owns |
| 9 | `License` | no | One line | The licence text |

## Fit rules

- A section that wants more than 15 lines of prose is the signal that the detail belongs in a doc. Keep a link and one sentence.
- Omit an optional section with nothing to say; never write a heading with filler.
