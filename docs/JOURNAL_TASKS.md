# Journal-first backlog — 27 September 2026

> Historical review backlog. The subsequent agreed scope is in
> [JOURNAL_IMPLEMENTATION.md](JOURNAL_IMPLEMENTATION.md), which takes precedence
> over conflicting requirements here. Undo (J10) is explicitly deferred; the
> new brief resolves the journal, block, pane, and command decisions.

## Objective and working rules

Make y-felin a dependable everyday bullet journal before adding checklists,
inventory, CPD, or general plugin infrastructure. Preserve the modular/shared-RDF
direction without making it the immediate deliverable.

All tasks below are open. Ready tasks may retain existing bindings; decision
tasks require agreement before their dependent implementation starts. Each
implementation should include focused tests, appropriate build/test checks,
and a brief handoff describing behaviour, limitations, and remaining decisions.
Read AGENTS.md and preserve unrelated changes. Do not use personal data for tests.
Do not silently change keys, entry semantics, or persistence formats.

## Ready: current usability and reliability

### J01 — Correct screen geometry and introduce a list viewport

- Problem: an 80x24 render with 30 entries loses rows and the selection; the
  capture prompt overlaps an entry. Footer reservation is one row although its
  separator and content occupy two.
- Scope: budget actual header/footer/content heights, prevent row shrinking or
  overlap, render a scroll window, and keep selection and composer visible.
  Apply bounded scrolling to help as well. Retain hideable bars.
- Acceptance: 0, 1, 30, and 200 entries render without overlap; first/last
  selection and capture remain visible; resizing and toggling bars remain safe.
  Test 80x24, a narrower terminal, and very short heights. Assert geometry and
  selected-row visibility, not just presence of text somewhere in a frame.
- Starting points: src/tui/layout.ts, components/MainArea.tsx,
  components/PerspectiveBody.tsx, components/HelpPanel.tsx, useTuiActions.ts,
  test/tui.test.tsx (component paths are under src/tui/).

### J02 — Replace diagnostic chrome with contextual information

- Scope: use y-felin branding; remove permanent size/row/column and internal
  editor diagnostics; prioritise current context, useful key hints, and concise
  status. Show save/cancel hints while composing. Retain a discoverable help path
  when width is limited and derive hints from the effective bindings.
- Acceptance: at 80 columns the important controls are readable; empty state,
  selection, editing, and help each have appropriate hints. Local-only operation
  does not look like a connection failure. Workflow hints describe actions,
  not merely left/right. Explain all currently rendered task-state symbols.
- Dependencies: coordinate height changes with J01; do not adopt proposed keys.
- Starting points: TopBar.tsx, BottomBar.tsx, HelpPanel.tsx, theme.ts,
  core/perspectives.ts.

### J03 — Make the existing inline editor competent

- Scope: caret movement, Home/End, backward/forward deletion, paste handling,
  and horizontal visibility of the caret in long titles. Handle Unicode without
  corrupting characters. Keep the current Enter-save/Esc-cancel behaviour pending
  J06; do not turn the whole journal into a text buffer.
- Acceptance: edit the middle of a title, paste text, correct non-ASCII text,
  save and cancel without altering other entries. Explicitly define handling
  of pasted newlines for the current single-line title field.
- Starting points: useComposer.ts, state.ts, PerspectiveBody.tsx.

### J04 — Make mutations observable and safe to submit

- Scope: display workflow/priority failures; preserve editor content on failed
  saves; prevent duplicate submissions while saving; refresh relevant status
  after every successful mutation. Distinguish local persistence from remote
  synchronisation and make failure messages recoverable/dismissible.
- Acceptance: delayed saves plus repeated Enter produce one entry; failed
  writes retain recoverable content; priority/workflow failures are visible;
  pending-change status updates without needing another capture operation.
- Starting points: useComposer.ts, useTuiActions.ts, shell.tsx.

### J05 — Separate implemented bindings from design proposals

- Scope: audit KEYBINDINGS.md against the actual keymap; document implemented
  priority binding; fix stale repository links; explicitly label the appended
  command ideas as proposals. Preserve those ideas rather than deleting them.
- Acceptance: a reader can distinguish current behaviour from proposed q/Q,
  t, i, g, m, and c meanings. No runtime binding changes in this task.

## Decisions, then implementation

### J06 — Agree the keyboard grammar and mode transitions

- Decision task: establish navigation/normal and text-editing flows, prefix
  families, any optional leader, opening/back behaviour, save/cancel behaviour,
  and the relationship between journal commands and text-editing commands.
- Discuss explicitly: whether i immediately starts typing or awaits an entry
  type; whether Esc cancels edits or leaves text input while retaining a draft;
  whether q/Q and t change meaning; whether h/l should keep changing task state.
- Acceptance: agreed table of modes and transitions, examples of full command
  sequences, cancellation/invalid-prefix rules, and migration notes. No implicit
  timeout-dependent ambiguity between a complete command and its longer form.

### J07 — Implement the agreed command grammar and prefix feedback

- Depends on J06. Add visible pending-prefix feedback and available continuations;
  allow Esc to cancel a partial command. Keep semantic actions independent of
  bindings and generate help from effective configuration.
- Acceptance: agreed sequences work; incomplete/invalid sequences do not mutate
  records; text typed in the editor does not trigger navigation commands;
  configurable bindings and any agreed count/motion behaviour have tests.
- Non-goal: implementing all of Vim's grammar, macros, or plugin keymaps.

### J08 — Define the minimum useful bullet journal

- Decision task: walk through capture, daily review, unfinished work, and finding
  earlier entries. Agree which entry types, daily logs, collections, migration,
  scheduling, and search are essential now and which can wait.
- Resolve journal date versus creation timestamp, ordering within a day, the
  role of Inbox versus today's log, and what migration means for record identity
  and history. Existing task states are not automatically a complete journal
  model. Do not invent deletion or migration semantics on the user's behalf.
- Acceptance: concrete end-to-end examples and a bounded first-use milestone;
  each agreed capability becomes a small implementation task with data and UI
  acceptance checks. New RDF fields require a real workflow and compatibility
  checks, not speculative ontology expansion.

### J09 — Open and find journal entries without losing context

- Depends on J06 and the relevant J08 decisions. Provide an entry detail view
  where long text is readable, and the agreed minimal search/filter navigation.
  Return to the same selection, scroll position, and filter after opening.
- Acceptance: find and read an older, long entry; return without losing place;
  handle no results and cleared filters. Do not require a permanent side pane.

### J10 — Add recovery for journal mutations

- Depends on J06/J08 semantics. Define undo scope before implementation: which
  actions are reversible, whether history survives restart, and how failures
  affect it. Implement a bounded useful subset; do not imply global undo across
  independent apps or synced changes.
- Acceptance: agreed reversible actions restore the correct record/state;
  failed operations do not pollute undo history; unsupported actions are clear.
  Do not add destructive delete merely to exercise undo.

### J11 — Validate the journal milestone through real use

- Depends on the agreed essential tasks. Run capture/edit/review/revisit flows
  on representative test data, restart the app, and verify persistence. Cover
  long lists, long text, small terminals, failure recovery, and keyboard-only use.
- Ask the user to try the journal in everyday use and record remaining friction.
  Passing tests alone is not evidence that the product is comfortable to use.
- Exit criterion: the agreed journal workflow is usable without external repair
  or hidden keyboard knowledge. Only then select the next capability.

## Suggested order

J01–J05 can proceed with current semantics. Discuss J06 and J08 alongside those
repairs; implement J07 and agreed journal slices next, then J09/J10 as prioritised
by that scope, followed by J11. Future plugins must not force all capabilities
into journal-shaped records, but plugin infrastructure is not this milestone.
