# Keybindings

## Purpose

This document defines the current action vocabulary, default keybindings, and reserved key space for y-felin.

It is a planning and coordination document. The goal is to keep:

- semantic actions stable
- keybindings configurable
- perspective-specific overrides possible
- help output derivable from the same model

Keybindings are application configuration, not ontology.

## Principles

- Actions come first. Keys are bindings to actions.
- Action ids should stay stable even if bindings change.
- High-frequency actions should use simple unmodified keys where possible.
- Perspective-specific bindings may override global bindings.
- Arrow keys should remain supported alongside vim-style navigation where appropriate.
- Shifted and leader-based bindings should be used for lower-frequency or more global actions.
- We should reserve useful keys deliberately before the interaction surface grows too large.

## Terms

- `action`
  A semantic operation such as `entry.create.task` or `entry.workflow.next`.

- `binding`
  A key expression mapped to an action.

- `global binding`
  A binding available across perspectives unless overridden.

- `perspective binding`
  A binding that applies only in one perspective and may override a global binding.

- `stroke`
  One keypress, optionally with modifiers.

- `sequence`
  Multiple strokes pressed consecutively.

- `leader`
  A configurable prefix stroke used to group lower-frequency commands.

## Key Expression Syntax

The binding language supports:

- single keys
- modified keys
- sequences
- special keys in angle brackets

Examples:

- `j`
- `<ctrl>+n`
- `g g`
- `<leader> q`
- `<shift>+<up>`

Special tokens are written in `<>`.

Examples:

- `<ctrl>`
- `<shift>`
- `<alt>`
- `<meta>`
- `<up>`
- `<down>`
- `<left>`
- `<right>`
- `<esc>`
- `<enter>`
- `<tab>`
- `<space>`
- `<del>`
- `<insert>`

Escaped literal syntax characters:

- `<lt>` means `<`
- `<gt>` means `>`
- `<=>` means `=`

Current default leader:

- `<space>`

## Action Inventory

### App Actions

- `app.quit`
  Exit the TUI cleanly.

- `help.context`
  Open contextual help for the current perspective.

- `help.global`
  Open the global help page.

### Cursor Actions

- `cursor.up`
  Move selection up within the focused list.

- `cursor.down`
  Move selection down within the focused list.

### Entry Creation Actions

- `entry.create.task`
  Create a new task in the current perspective.

- `entry.create.note`
  Create a new note in the current perspective.

### Entry Edit Actions

- `entry.edit`
  Edit the selected entry title.

### Entry Workflow Actions

- `entry.workflow.previous`
  Move the selected entry one step toward the earlier workflow state.

- `entry.workflow.next`
  Move the selected entry one step toward the later workflow state.

Current workflow progression applies only to task entries:

- `open`
- `active`
- `done`

Notes currently do not participate in workflow progression.

## Applicability Rules

### Global

- `app.quit`
- `help.context`
- `help.global`

### List-Focused Actions

- `cursor.up`
- `cursor.down`

These require a list-like panel with a current selection model.

### Selected Entry Actions

- `entry.edit`
- `entry.workflow.previous`
- `entry.workflow.next`

These require a selected entry.

### Workflow Actions

- `entry.workflow.previous`
- `entry.workflow.next`

These are meaningful only for entry kinds that support workflow progression.
Currently:

- `task`: yes
- `note`: no

### Capture Actions

- `entry.create.task`
- `entry.create.note`

These apply in perspectives that allow direct capture.
Currently:

- `inbox`: yes

## Current Default Bindings

### Global Defaults

- `q` -> `app.quit`
- `?` -> `help.context`
- `H` -> `help.global`
- `j` -> `cursor.down`
- `k` -> `cursor.up`
- `<down>` -> `cursor.down`
- `<up>` -> `cursor.up`

### Inbox Defaults

- `h` -> `entry.workflow.previous`
- `l` -> `entry.workflow.next`
- `t` -> `entry.create.task`
- `n` -> `entry.create.note`
- `e` -> `entry.edit`

## Current Interaction Model

### Browse Mode

- navigation:
  - `j`, `k`, `<down>`, `<up>`
- workflow:
  - `h`, `l`
- capture:
  - `t`, `n`
- edit:
  - `e`
- help:
  - `?`, `H`
- quit:
  - `q`

### Editor Mode

- text input goes to the inline editor
- `<enter>` confirms
- `<esc>` cancels

### Help Mode

- `?` opens contextual help
- `H` opens global help
- `<esc>` closes help and returns to the previous perspective

## Reserved Keys

These should be treated as intentionally unassigned or cautiously assigned until the related semantics are designed properly.

- `p`
  Likely priority-related.

- `A`
  Likely abandon-candidate or archive-like review action.

- `d`
  Potential conflict space: delegate, defer, details, delete.

- `x`
  Possible fast-path completion or destructive action. Do not assign casually.

- `m`
  Potential future message/mail entry creation.

- `o`
  Potential open/follow action.

- `<leader> ...`
  Reserve for lower-frequency actions and grouped commands.

## Likely Next Actions

The following actions are likely to be needed soon, but are not yet implemented:

- `entry.priority.toggleHigh`
- `entry.review.toggleNeedsConfirmation`
- `entry.review.toggleAbandonCandidate`
- `entry.coordination.markToDelegate`
- `entry.coordination.markDelegated`

These should be added only after:

- their semantic model is agreed
- the visible marker columns are finalized
- conflicts with existing key usage are reviewed

## Open Questions

- Should `entry.edit` remain title-only, or eventually become a family of edit actions?
- Should `help.context` remain `?` permanently, or should help move under `<leader>` later?
- Do we want direct single-key bindings for future triage actions, or should some move under `<leader>`?
- Should workflow actions remain task-only, or should some future journal entry kinds also support ordered progression?
- When we add sidecar/detail panels, do cursor actions remain panel-local or become focus-navigation actions?

## Configuration Direction

The intended long-term model is:

- stable semantic action ids in code
- keybindings loaded from user-editable config
- perspective-local overrides layered over global defaults
- help pages generated from the effective keymap, not handwritten per key

That means this document should remain aligned with:

- the action inventory in code
- the default keymap in [src/tui/keymap.ts](/media/michal/data/code/melin/src/tui/keymap.ts)
- the active help rendering in [src/tui/shell.tsx](/media/michal/data/code/melin/src/tui/shell.tsx)

Some of the actions will need multi stroke bindings. 

i - stands for insert and it will be followed by a type of a journal entry type especially if the type has no direct binding. 

i g - is insert global, when in a project, person or other focused perspective normal `i` inserts an entry in that context, `i g` starts an insert in the global inbox, so `i g n` creates a note in the global inbox

q - stands for question, mark for clarification(to toggle a questionmark for a question, or to create a question item by pressing `i q`. 

Q - is to quit. 

u - is for undo. 

x - is for delete

m - is for morph. `m t` is to morph an entry into a task, `m e` morphs to an event. 

g - is for 'go to', for switching perspectives. `g i` go to inbox

c - is for coordination. `c w` is 'waiting', `c b` is blocked, `c c` is cleared coordination status. 

o - is to open details
e - is to edit inline

t - is to tag. 
