# Session handoff: portfolio review to y-felin

This note carries forward the useful context from the Codex conversation that
started in `~/Work/projects-review` on 26 September 2026 and continued with
y-felin through 27 September. The local session ID is
`01a0dece-ff99-7912-b20d-ae5546abe1e3`. It records intent and the state at
the end of that conversation; current code and tests determine current behaviour.

## What the user wants

- Make the bullet journal comfortable for everyday use before building Ticks,
  Stuffed, CPD features, or a general plugin platform. The journal is the main
  working surface, with a continuous dated feed rather than one isolated day.
- Keep the interface quiet, compact, and keyboard first. Neovim inspired normal
  and text editing flows and composable commands are preferred. Space should be
  used efficiently while day boundaries and pane focus remain clear.
- Keep personal data local first, with optional Solid Pod synchronisation through
  lofipod. Preserve existing records and unknown RDF data when adding workflows.
- In the longer term, y-felin may be a modular TUI host. Different plugins or
  independent applications could present overlapping workflows over compatible
  RDF records. The host/plugin interface and shared data conventions are separate
  contracts. CLI, mobile, and web interfaces are possible future surfaces.

## Decisions from the journal discussion

- The journal itself is the initial capture surface. A separate inbox and PARA
  organisation were considered, then deferred. Empty days stay hidden unless
  visited; entries may be added retrospectively to a selected past day.
- Initial types are note, idea, task, event, checklist, and appointment. A note
  is something to remember; an idea is something to explore. The type initially
  signals intent without implying a full scheduler or checklist workflow.
- Entries have one short heading in the feed. Details open explicitly in preview
  or edit mode and contain independent paragraph blocks and at most one level of
  child entries. Bold and italic inline emphasis are enough for now.
- Capture commands depend on the focused pane: `in`/`it` insert before,
  `ahn`/`aht` after, `ifn`/`ift` first, `iln`/`ilt` last, and `an`/`at` append.
  In the journal, append targets today without moving focus away from an older
  day. In details, `n` creates a paragraph and `t` a child task. Other entry
  types follow the same final-letter pattern.
- Local autosave was chosen. Undo was explicitly deferred. A failed save should
  retain the draft for retry. Independent RDF entities for paragraphs and entries
  fit the lofipod storage model.

The agreed acceptance reference is [JOURNAL_IMPLEMENTATION.md](JOURNAL_IMPLEMENTATION.md).
[KEYBINDINGS.md](KEYBINDINGS.md) describes current controls;
[DIRECTION.md](DIRECTION.md) explains the longer-term product direction.
The earlier [JOURNAL_TASKS.md](JOURNAL_TASKS.md) is a historical review backlog
and contains proposals superseded by the implementation brief.

## State at the end of the conversation

- The first journal workflow was implemented in commit `9bba726`. It includes a
  multi-day feed, six entry types, explicit details panes, paragraph and child
  records, emphasis rendering, and local autosave. Legacy task and note records
  remain visible without a data rewrite.
- Lofipod was upgraded to 0.3.0 in `6002f2f`. The app carries its expanded sync
  state through the integration.
- The final UI changes in `f90ba27` add blank space between days, a vertical
  details divider, and navigation that skips populated day headings but stops on
  empty days. Pane headings and horizontal rules were removed to save space.
- Those commits were pushed to `origin/main`. The final build and 79 tests passed
  in that session. This is historical verification, not a current test result.

## Next useful work

Try the journal for real daily capture, review, and editing, then record concrete
friction before choosing a second capability. The implementation brief still
calls for everyday-use feedback. Deferred topics include a separate inbox,
collections/PARA, people and delegation, future and due-date views, checklist
templates and runs, inventory, search, undo, full Markdown, broader sync UX,
and plugin infrastructure. Do not treat those as already agreed implementation
tasks.
