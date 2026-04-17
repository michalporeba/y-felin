# y-felin

`y-felin` (the mill in Welsh) is a keyboard-first personal task manager for the terminal.

It is designed to feel fast, simple, and local. Your data lives on your machine first,
and the longer-term goal is to let you sync that data to your own Solid Pod 
without turning the app into a cloud service that owns your information.

- capture tasks and notes quickly
- stay keyboard-first
- keep working offline
- keep your data under your control
- build toward optional sync using open web standards

The interface is inspired by the speed of terminal tools and 
by simple personal systems such as todo lists and parts of bullet journaling.

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
with an `inbox`-style workflow for working with items locally. 
Solid sync is part of the direction of the project, 
but the local experience comes first and should remain useful on its own.

Today the codebase already includes:

- a full-screen TUI
- an inbox perspective
- inline capture for tasks and notes
- item editing
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

The app also supports:

```bash
npm run tui -- --data-dir=./data
```

Use `--data-dir` if you want to choose where the local data is stored.

### First minute in the app

The current interface is intentionally simple:

- press `t` to add a task
- press `n` to add a note
- use `j` and `k` or the arrow keys to move
- press `e` to edit the selected item
- press `?` for help
- press `q` to quit

## Project direction

y-felin is also an exploration of a calmer model for personal software:

- local by default
- optional sync instead of mandatory accounts
- personal data that is portable
- open standards underneath, without forcing technical language onto everyday users

## For contributors

If you want the deeper technical and architectural context:

- [ADR.md](ADR.md) records the current architecture decisions
- [PLANS.md](PLANS.md) lists small implementation slices
- [GLOSSARY.md](GLOSSARY.md) defines project terminology used in design discussions
- `ontology.ttl` contains the evolving ontology used by the project

## License

[MIT](LICENSE)
