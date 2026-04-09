# PLANS

## Purpose

This file breaks Melin into small implementation slices that can be developed,
tested, and reviewed independently. `ADR.md` records architecture decisions;
this file is the sequential roadmap.

## Current decisions and instructions

- Build Melin in TypeScript.
- Use Ink for the primary TUI.
- Keep the TUI full-screen and resize-aware.
- Keep all user actions scriptable through a CLI as well as the TUI.
- Use a shared application core so TUI and CLI dispatch the same actions.
- Target Node.js `24+`.
- Use `lofipod/node` with SQLite for local persistence.
- Keep the first user-facing flow local-only; sync remains a seam for later.
- Use `inbox` as the first perspective.
- Start `inbox` with a single full-width main area and no sidecar.
- Keep top and bottom bars fully hideable.
- Use `Item` as the user-facing term for the first slice.
- Start with title-only capture and task-backed RDF storage.
- Expand `ontology.ttl` only when a concrete user flow requires it.
- Keep configuration minimal and user-editable.
- Design for BDD acceptance tests plus focused lower-level tests.

## Implementation principles

- Keep slices vertical and small.
- Each step must produce something testable on its own.
- Prefer shared action/core logic over UI-specific logic.
- Avoid speculative ontology work.
- Defer Pod attachment UX until local workflows are solid.
- If a missing capability clearly belongs in `lofipod`, note it and move that
  work there rather than reimplementing it in Melin.

## Sequential steps

### Step 1: Capture decisions in repo docs

- Goal: create the project guidance documents needed before code work begins.
- Scope:
  - add `ADR.md`
  - add `PLANS.md`
  - keep `README.md` as the short project overview
- Acceptance:
  - the repo contains architecture decisions and a small-slice roadmap
  - the first implementation cycle is explicitly constrained
- Non-goals:
  - no executable code

### Step 2: Minimal project skeleton

- Goal: create the smallest runnable TypeScript/Node skeleton.
- Scope:
  - package metadata
  - TypeScript config
  - entrypoint structure for core, CLI, and TUI
  - test runner baseline
- Acceptance:
  - dependencies install cleanly
  - a placeholder command runs
  - tests can be executed
- Non-goals:
  - no real TUI behavior
  - no persistence integration

### Step 3: Shared action model

- Goal: establish a terminal-independent application core.
- Scope:
  - action definitions
  - result and error conventions
  - perspective registry contract
  - minimal item summary type
- Acceptance:
  - core actions can be invoked without Ink
  - the same action contract is usable by CLI and TUI adapters
- Non-goals:
  - no `lofipod` integration yet

### Step 4: CLI vertical slice

- Goal: prove the verb-first command model early.
- Scope:
  - commands such as `melin show inbox`, `melin create item`, `melin list items`
  - human-readable output
  - optional `--json` output
  - stable exit-code behavior
- Acceptance:
  - acceptance tests cover command invocation and output
  - CLI handlers go through shared actions
- Non-goals:
  - no alternate-screen TUI yet

### Step 5: Ink shell

- Goal: establish the full-screen TUI shell.
- Scope:
  - alternate-screen Ink app
  - responsive layout on terminal resize
  - central perspective area
  - hideable top and bottom bar placeholders
- Acceptance:
  - the app opens full-screen and exits cleanly
  - resize behavior is tested
- Non-goals:
  - no real data yet

### Step 6: Local persistence with lofipod

- Goal: connect Melin to `lofipod/node` with SQLite.
- Scope:
  - engine creation
  - first entity mapping using current ontology
  - local storage path config
  - save and load title-only items
- Acceptance:
  - items persist across restart
  - tests cover create/list/read through the persistence boundary
- Non-goals:
  - no real Pod sync workflow

### Step 7: Inbox list flow

- Goal: make the inbox perspective useful for reading and navigating items.
- Scope:
  - render persisted items in newest-first order
  - keyboard navigation
  - focused selection
  - empty-state behavior
- Acceptance:
  - inbox opens and displays stored items
  - CLI listing and TUI listing share the same selector behavior
- Non-goals:
  - no inline capture yet

### Step 8: Inline capture flow

- Goal: support the first real interactive creation workflow.
- Scope:
  - inline composer in inbox
  - create title-only items
  - submit and cancel behavior
  - immediate list refresh after save
- Acceptance:
  - acceptance tests cover capture, cancel, save, and restart persistence
  - TUI and CLI creation use the same core action
- Non-goals:
  - no editing existing items yet

### Step 9: Item-scoped edit flow

- Goal: allow in-place editing of one selected item.
- Scope:
  - edit title of the focused item
  - save and cancel behavior
  - preserve focus after edit
- Acceptance:
  - editing is covered by acceptance and unit tests
  - no global list edit mode is introduced
- Non-goals:
  - no bulk editing
  - no sidecar

### Step 10: Sync status seam

- Goal: surface sync as a seam without making it a required workflow.
- Scope:
  - sync status boundary in the core
  - dormant/local-only sync state in CLI and TUI
  - placeholders for future attach/bootstrap actions
- Acceptance:
  - local-only usage remains the default
  - UI can show sync-related state without a Pod connection
- Non-goals:
  - no Pod login or attachment flow

### Step 11: Review and next-slice decision

- Goal: reassess scope after the first usable local inbox exists.
- Scope:
  - review terminology
  - review ontology expansion needs
  - decide between next features such as metadata, sidecar, `today`, or new
    item types
  - note any `lofipod` gaps discovered during implementation
- Acceptance:
  - roadmap and ADR are updated based on real implementation learnings
- Non-goals:
  - no automatic expansion into a larger feature set

## Testing expectations per slice

- Every step should define explicit acceptance checks.
- Prefer acceptance scenarios for user-visible behavior.
- Support them with focused unit and component tests.
- Use CLI tests early because they validate shared actions without TUI
  rendering complexity.
- Use Ink component tests once the shell and inbox flows exist.
- Defer real Solid integration tests until Pod workflows are in scope.

## Deferred topics

- Final terminology beyond `Item`
- Sidecar introduction and behavior
- `today` as a real perspective
- Richer task metadata such as status or due dates
- Additional RDF-backed item types such as notes or events
- Pod authentication and attachment UX
- Project-local and Pod-synced configuration
