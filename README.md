# y-felin

`y-felin` (the mill in Welsh) is a keyboard-first bullet journal for the terminal.

It is designed to feel fast, simple, and local. Your data lives on your machine first,
and the longer-term goal is to let you sync that data to your own Solid Pod 
without turning the app into a cloud service that owns your information.

- capture tasks and notes quickly
- stay keyboard-first
- keep working offline
- keep your data under your control
- build toward optional sync using open web standards

The interface is inspired by the speed of terminal tools and bullet journaling.

## Why this project exists

Most task tools are built around accounts, subscriptions, 
and storing your information on someone else's servers.

y-felin takes a different approach. It is a local-first tool, 
so the app works from your own local data and remains useful offline. 
The longer-term plan is optional sync through Solid Pods, 
so your data can live in a store you control rather than inside a single vendor's product.
RDF is part of the data model underneath, with the aim of keeping that data portable and interoperable.

These ideas are often discussed in fairly technical language. 
Part of the point of y-felin is to turn them into something practical: 
a task manager that is straightforward to use and does not require buying into a hosted platform.

## Current status

The project is still early.

Right now the main focus is the local terminal experience. 
The current application surface is the TUI launched by `fln`,
with a continuous dated journal as its default view.
Solid sync is part of the direction of the project, 
but the local experience comes first and should remain useful on its own.

Today the codebase already includes:

- a full-screen TUI
- a multi-day journal with explicit date navigation
- notes, ideas, tasks, events, checklists, and appointments
- block-level details with paragraphs and one level of child entries
- preview and edit panes with local autosave
- existing task and note records shown on their original journal dates
- local persistence
- a shared core designed to support sync later

## Getting started

### Requirements

- Node.js `24+`
- npm

### Run from source

```bash
npm install
npm run tui
```

The source script uses `./data` by default. To use another directory:

```bash
npm run tui -- --data-dir=/path/to/your/journal-data
```

The last `--data-dir` flag wins. Existing task and note records in the chosen
directory remain visible in the journal on their original local calendar dates.

### First minute in the app

The journal opens at today. It shows one continuous scrollable feed; empty dates
stay hidden except the day you are visiting. Entries are intentionally one line.

- `an` appends a note to today; `at` appends a task.
- `in` inserts a note before the selected entry; `it` inserts a task.
- `ahn`/`aht` insert after; `ifn`/`ift` insert first; `iln`/`ilt` insert last.
- Replace the last letter with `i`, `e`, `c`, or `a` for an idea, event,
  checklist, or appointment. The type signals intent; specialised scheduling
  and checklist runs are future work.
- `j`/`k` or arrows move, `gt` visits today, `gd` chooses a date, and
  `[d`/`]d` visit previous/next populated days. `zo` reverses day order.
- `o` opens a preview; `e` opens details with focus there. `Ctrl+w h/l` switches
  panes and `Ctrl+w c` closes details. `Enter` edits the selected line or block.
- In details, `in`/`an` create paragraphs and `it`/`at` create child tasks.
  Child entries can contain prose but cannot contain grandchildren.
- `Esc` leaves text editing after saving. `Ctrl+n` inserts a soft line break in
  a paragraph. `?` shows help; `q` quits from normal mode.

Headings and paragraphs accept `**bold**` and `*italic*`. Formatting is shown in
preview and kept as literal source when editing. Saves happen locally after a
short pause and when you leave the block. If a save fails, the draft stays open
for retry; `Ctrl+q` opens the exit warning while editing. Unsaved text may be
lost if the process crashes before a successful save.

Set `Y_FELIN_JOURNAL_ORDER=newest-first` to open with newer days at the top; the
default is oldest first. Set `Y_FELIN_ASCII_ICONS=1` for simple ASCII markers.
You can also put `journal-config.json` in the chosen data directory:

```json
{
  "dayOrder": "newest-first",
  "keybindings": {
    "z n": "capture.today.note"
  }
}
```

Keybinding values name journal actions; `null` removes an existing binding.
The environment day-order setting takes precedence over the file.
At narrow terminal widths, details use the available single pane. Undo and a
separate inbox workflow are not part of this journal slice.

See [KEYBINDINGS.md](docs/KEYBINDINGS.md) for the complete current grammar.

## Project direction

y-felin is also an exploration of a calmer model for personal software:

- local by default
- optional sync instead of mandatory accounts
- personal data that is portable
- open standards underneath, without forcing technical language onto everyday users

## For contributors

If you want the deeper technical and architectural context:

- [Session handoff](docs/SESSION_HANDOFF_2026-09-27.md) carries forward the
  decisions and last known state from the September 2026 portfolio review chat
- [ADR.md](docs/ADR.md) records the current architecture decisions
- [PLANS.md](docs/PLANS.md) lists small implementation slices
- [GLOSSARY.md](docs/GLOSSARY.md) defines project terminology used in design discussions
- `ontology.ttl` contains the evolving ontology used by the project

## License

[MIT](LICENSE)
