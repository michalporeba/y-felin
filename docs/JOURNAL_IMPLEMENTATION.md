# Implementation brief: the first usable journal

Recorded 27 September 2026 as the implementation brief. The first journal slice
is implemented in the current checkout; this document remains its acceptance
reference. Everyday-use feedback is still needed before calling the workflow
finished from a product perspective.

## Delivery note

Journal is the default TUI; existing task/note records are projected into it
without a data rewrite. Entries and paragraphs are independent RDF entities.
The implementation uses exact fractional order keys, so repeated insertion
between the same two blocks does not exhaust floating-point precision. Unknown
RDF triples, including additional rdf:type assertions, survive supported edits.
The data directory accepts `journal-config.json` for day order and keybindings;
README.md and KEYBINDINGS.md document the current controls. The separate Inbox
shell remains available explicitly for compatibility. Autosave is local; it
does not provide crash recovery for unflushed drafts, undo, or conflict merging
across independent applications.

## Instructions and precedence

Changes to this brief should be delivered in small, tested vertical slices. Read AGENTS.md first;
inspect the current code and installed lofipod API; preserve existing changes
and data. Follow graphify instructions when available, reporting missing tooling
or artifacts rather than claiming checks were performed.

This brief supersedes conflicting proposals in JOURNAL_TASKS.md, PLANS.md, and
KEYBINDINGS.md: inbox-first layout, automatic details opening, global-only append,
child-destination commands, Esc-discard, and implementing undo now. Update current
behaviour documentation as implementation progresses; retain useful historical
context. Requirements below are agreed unless marked implementation defaults.
Defaults resolve minor remaining details; document refinements and ask before
materially changing scope or semantics.

## 1. Goal and boundaries

Make a dependable everyday bullet journal before adding other capabilities or
general plugin infrastructure. Keep domain behaviour independent of Ink and use
RDF-backed local persistence through lofipod.

Deliver a continuous dated journal, six basic entry types, composed keyboard
capture, explicit preview/edit panes, independently stored paragraphs and child
entries, bold/italic emphasis, autosave, and visible failure recovery.

The journal is the capture surface; no separate inbox workflow in this slice.
Existing inbox records must remain accessible through a compatible mapping or
tested migration. Never discard data when changing the default perspective.

## 2. Journal, dates, and ordering

- Open Journal positioned at today. Show multiple days in one scrollable pane
  with visible date headings, allowing yesterday's entries alongside today's.
- Normally hide empty dates. Visiting an empty date temporarily shows a heading
  and capture prompt; leaving it empty must not accumulate persisted empty days.
- Entries default to today. Navigating another day allows retrospective capture;
  position-relative insertion uses that day.
- Journal date is distinct from creation timestamp and any future appointment,
  event, or due date. No scheduled/future view now.
- Provide a documented, user-changeable ascending/descending day-order setting.
  Preserve selection by identity when changing it.
- Implementation default: oldest-to-newest days, explicit first-to-last order
  within each day. Reverse days, not their internal entries. Do not derive user
  insertion order solely from timestamps.
- Use local calendar dates; test timezone boundaries and capture across midnight.
- Journal entries occupy exactly one visual line: icon, heading, and concise
  indicators. Truncate rather than wrap. Full headings remain accessible in
  details/editing. Indicate additional content without opening it automatically.

## 3. Entry types and blocks

| Type | Command suffix | Meaning |
| --- | --- | --- |
| Note | n | Something to remember |
| Idea | i | Something to explore |
| Task | t | Something to do |
| Event | e | Event record |
| Checklist | c | Checklist-labelled entry |
| Appointment | a | Appointment-labelled entry |

All types have a stable identity, one-line heading, icon, and optional details.
Provide distinguishable icons and terminal-safe fallbacks. All share capture,
navigation, editing, details, and persistence features. Preserve existing task
states and priority data/actions. Do not infer specialised scheduling or checklist
execution behaviour just from labels.

Details are an ordered mixture of prose paragraphs and typed child entries.
Paragraphs have text but no separate heading/type icon. In details, note commands
create paragraphs rather than nested note headings: this is the first experiment
for the note/paragraph distinction.

Only one child-entry level is allowed. Children have their own identity, type,
and state, but do not appear independently in the main journal. Their parent
relationship must support future aggregate task/project views; do not build
those views now.

Implementation default: child entries may have prose details, but no child
entries of their own. Edit child prose in the existing right pane with clear
parent context and a return action, not a third pane. Reject deeper nesting
visibly rather than silently changing the target.

The first editable line of a parent's details is its heading. Editing it updates
the journal heading; do not maintain a separate competing title copy. No leading
Markdown # is required.

## 4. Capture grammar: focused pane determines destination

Commands apply only in normal/navigation mode. X means any type suffix above.

| Command | Journal focused | Details focused |
| --- | --- | --- |
| iX | Insert before selection in its day | Insert before current block |
| ahX | Insert after selection, as sibling | Insert after current block |
| ifX | Insert first in selected day | Insert first in these details |
| ilX | Insert last in selected day | Insert last in these details |
| aX | Append to today's journal | Append to these details |

In details, n creates a paragraph; other suffixes create child entries where
nesting permits. Thus in/an insert/append a paragraph; it/at insert/append a
child task. Only paragraph creation is allowed in a child's prose-only details.
No separate ip/ap commands.

Examples: it task before; ahn note/paragraph after; ifn first note/paragraph;
iln last note/paragraph; an append note/paragraph; ii insert idea; ia insert
appointment; aa append appointment.

When aX targets today from an older day, retain the original day's selection and
scroll position after capture. Show a capture editor labelled with its actual
target without jumping the journal to today. Details capture remains local to
details. For an empty list, positional commands target that empty list.

Drop earlier isn/asn, atn/aTn, and global-inbox ign/agn proposals. i and a are
prefixes, not immediate text insertion. Show pending prefixes and continuations;
Esc cancels a prefix without mutation. Do not resolve complete-command/prefix
conflicts using typing-speed timeouts. Invalid sequences must not unexpectedly
fall through into a different mutating action.

## 5. Navigation and explicit details panes

| Binding | Action |
| --- | --- |
| j / k, Down / Up | Down/up in focused normal-mode list |
| gg / G | First/last item in focused list/feed |
| Ctrl+d / Ctrl+u | Half-page down/up in focused pane |
| gt | Go to today, including an empty-day target |
| gd | Date picker, including dates without entries |
| [d / ]d | Previous/next populated calendar day |
| gv | View picker; do not invent extra views to populate it |
| o | Toggle details preview; keep journal focus |
| e | Open details and focus its normal-mode editor |
| Ctrl+w h / Ctrl+w l | Focus journal/details |
| Ctrl+w c | Close details and return to journal |

Date navigation is journal-scoped. [d/]d remain chronological regardless of sort;
j/k always follow screen direction. No leader is required. Keep semantic actions
separate from configurable bindings; derive hints/help from the effective keymap.

Default is one full-width pane. Explicit opening gives approximately equal left
journal/right details panes. Never open on selection alone. While preview is
open it follows journal selection; entries without extra content show their
heading/empty state, not stale details or automatic closing/reopening.

Focus and mode are visible. Normal mode uses j/k to navigate; text insertion
types literal letters. Ctrl+w switching is the baseline. Do not swap Ctrl+j/k
semantics or depend on Ctrl+j being distinguishable from Enter. Optional Alt+j/k
other-pane movement is not required in this slice.

Implementation defaults for editor interactions not finally specified:

- Enter edits the selected heading or paragraph.
- Enter confirms a one-line heading. Esc leaves text insertion without discarding
  nonempty edits. Cancelling an empty never-saved capture creates no record.
- Paragraphs can contain soft line breaks. Choose and document Enter/paste
  behaviour; create additional blocks through the explicit capture commands,
  not implicit split/merge operations in this slice.
- Esc in details normal mode returns from child content to parent content, or
  returns journal focus when already at parent level; never discards edits.
- Retain existing quit/help and nonconflicting task-state/priority bindings for
  now. Do not implement earlier q-as-question, tagging, morphing, coordination,
  or delegation proposals. Document replacement of old direct capture shortcuts.

At narrow widths provide a documented single-pane fallback retaining context
and return position. Wide terminals use the default equal split. No third pane.

## 6. Markdown-like means inline emphasis only

- Support **bold** and *italic* in headings and paragraphs.
- Navigation/preview renders emphasis without delimiters; active-block editing
  exposes the literal delimiters. Preserve source formatting through round trips.
- Formatting does not split a block into additional RDF records.
- Incomplete/unmatched markup remains readable and editable; never lose text.
- Test Unicode, long formatted headings, truncation, and caret positioning.
- No Markdown links, # heading syntax, embedded lists/tables/code fences, or full
  document editor required. Child entries are records, not parsed checkboxes.

## 7. Persistence, autosave, and safety

Each entry and paragraph needs a stable RDF identity and independently persisted
content. The heading belongs to its entry, not a duplicated paragraph. Explicitly
store parent relationships and ordering. Position is not identity. Choose a
simple ordering strategy suitable for this local-first milestone.

Inspect installed lofipod before choosing mappings and update boundaries. It is
not to be treated as a CRDT. Separate RDF subjects alone do not prove independent
storage/conflict boundaries: verify the real update unit and document limitations.
Preserve unknown RDF properties during supported edits. Report library gaps;
do not claim cross-app conflict resolution without implementation and tests.

Implementation default: autosave enabled, short debounce, flush on block exit
and clean application exit. Manual-save mode is not required now. Avoid whole-
journal rewrites for a paragraph edit. Serialize/coalesce writes per record so
an older delayed save cannot overwrite newer content. Prevent duplicate capture.

Show saving/saved locally/unsaved failure states. Local save is not Pod sync.
Failed writes retain editable drafts and permit retry. Switching entries must
not discard drafts. Quit with failed saves must warn and allow returning to
the draft. Do not claim crash recovery for unflushed text unless implemented;
document that limitation. Do not autosave empty capture placeholders.

Undo/redo is explicitly deferred, even session-only undo. Do not add deletion,
block merging, morphing, or destructive migration as incidental editor features.
Ordinary text correction remains supported; Esc is not an undo operation.

Preserve existing records, IDs, state, priority, and RDF content. Test schema
adaptation with fixtures. For legacy records without journal dates use documented
creation-time/local-date mapping when available; do not assign everything to
today. Report ambiguity for missing dates and choose a safe documented fallback.
Never test against live user data. Back up before material real-data migration;
disclose the migration and rollback approach.

## 8. Existing UI repairs included in this work

- Correct actual header/footer height accounting and list/help viewports. Keep
  selection and composer visible; never shrink rows into overlapping content.
- Replace MELIN/debug dimensions/internal labels with y-felin branding, context,
  focus/mode, useful hints, and concise save/sync status. Keep bars hideable.
- Prioritise useful hints at ordinary widths; explain all type/status symbols.
- Add caret movement, Home/End, proper forward/backward deletion, Unicode-safe
  edits, paste handling, and visibility of the caret in long text.
- Surface workflow/priority errors; refresh relevant status after mutations.
- Preserve terminal cleanup and exit behaviour.

Starting points: src/tui/shell.tsx, layout.ts, keymap.ts, useComposer.ts,
useTuiActions.ts, useTuiKeyboard.ts, components/, src/core/perspectives.ts,
core actions/entity mappings, and test/tui.test.tsx. Inspect the current checkout
rather than assuming these boundaries have remained unchanged.

## 9. Delivery sequence and acceptance

Suggested slices:

1. Inspect API; define minimal entry/block/date/order mappings and legacy handling;
   add core persistence tests.
2. Fix layout/scrolling; add the default multi-day journal, date navigation,
   configurable day order, and empty-day capture.
3. Implement types, command grammar, prefix feedback, and target/focus rules.
4. Add panes, heading/paragraph editing, shallow children, and emphasis. Integrate
   autosave/error handling before declaring any editing slice complete.
5. Run end-to-end/failure/migration checks and update README, KEYBINDINGS, ADR,
   and PLANS to reflect delivered behaviour.

Required acceptance scenarios, using isolated temporary storage:

- Empty start shows today; all six types can be captured and survive restart.
- Historical-day in/ahn/ifn/iln insert in the correct positions; an targets today
  while retaining the historical day's selection and scroll position.
- Details in/an create local paragraphs; it/at create local child tasks. Pane
  focus changes command destination visibly. Reject grandchildren.
- gd visits an empty date; capture retains it, leaving empty does not. gt and
  default capture work across midnight/timezone boundaries; inject a test clock.
- Reversing day order retains selection, intra-day order, and chronological
  [d/]d behaviour. Test explicit ordering when timestamps are equal.
- Render 0/1/30/200 entries across days at 80x24, wide, narrow, and very short
  sizes: no overlap or invisible selection/editor. Test resize and hidden bars.
- Details never auto-open; o retains focus; e enters details normal mode; pane
  switching/closing preserves context; preview follows selected entry.
- Editing the first details line updates the journal heading. Paragraphs and
  children persist independently; children do not duplicate into the feed.
- Bold/italic source round-trips; Unicode, long headings, and incomplete markup
  remain uncorrupted through rendering/editing/truncation.
- Partial/invalid commands and Esc cancellation do not mutate data; literal text
  insertion never invokes normal-mode commands.
- Delayed/failed saves retain recoverable drafts; retry works; no stale overwrite
  or duplicate submission occurs; failed-save exit warns.
- A paragraph update leaves unrelated blocks and supported unknown RDF fields
  intact. Legacy task/note fixtures remain accessible and preserve identities.
- Help describes effective bindings, modes, destination rules, and icons.

Run repository build and relevant unit/component/integration tests; report exact
commands and results, including environment-specific failures. Perform a keyboard-
only manual smoke test with disposable data. Passing tests does not replace the
user trying the journal in everyday use. Report remaining limitations honestly.

## 10. Deferred, not hidden requirements

Separate inbox/clarification; PARA/project/area/resource collections; people and
communication/delegation; future/due-date views/reminders; automatic migration or
rollover; aggregate child-task views; specialised checklist templates/runs;
inventory; search/filter expansion beyond date/view navigation; undo/redo;
destructive block operations; deeper nesting; full Vim grammar/macros; full
Markdown; new Pod authentication/sync/conflict UX; web/mobile; general plugin
infrastructure. Preserve useful seams without implementing these features now.
