# ADR

## Status

Accepted as the current architecture and constraints record for y-felin.

## Purpose

This document captures the decisions that should remain stable while the
implementation evolves in small slices. `PLANS.md` is the delivery roadmap;
this file records the architectural direction those steps should follow.

## Accepted decisions

### Product shape

- y-felin is a local-first personal information tool for technical users.
- The primary interface is a terminal user interface.
- The TUI should feel keyboard-first and friendly to users who are comfortable
  with neovim-like workflows.
- The first executable user flow is the `inbox` perspective.
- The first user-facing noun is `Item`, even though the first stored entity is
  task-backed.

### Runtime and implementation

- The application should be implemented in TypeScript.
- The primary TUI implementation should use Ink.
- The initial runtime target should be Node.js `24+`.
- The architecture should keep a shared application core so future front ends
  can reuse domain logic without coupling to Ink.

### TUI and CLI relationship

- Every user action exposed in the TUI should also be available through the
  command line.
- The CLI should use a verb-first command grammar such as `fln create item`
  and `fln show inbox`.
- TUI keybindings and CLI commands should dispatch the same application
  actions rather than maintain separate business logic.

### UI structure

- The TUI should use the full terminal and respond to terminal resize events.
- The preferred term for a user-visible work mode is `Perspective`.
- A perspective may contribute a main area, an optional sidecar, and optional
  top and bottom bar content.
- The initial `inbox` perspective should use only a full-width main area.
- Sidecar behavior is deferred until a later slice.
- The top and bottom bars are fully hideable.

### Interaction model

- The interaction model should favor direct keyboard actions over a global
  modal edit state.
- Quick capture should happen inline within the inbox perspective.
- Editing should be item-scoped and in place.
- y-felin should not model the main list as a text buffer edited like a file.

### Data and storage

- Local persistence should use `lofipod/node` with SQLite.
- All synchronization with Solid Pods should go through `lofipod`.
- The application should remain fully usable locally even when no Pod is
  attached.
- Sync should be treated as an architectural seam and a later user workflow,
  not a requirement of the first user-facing slice.

### Ontology

- y-felin should use and expand `ontology.ttl`.
- Ontology changes should be incremental and driven by concrete user flows.
- The ontology is currently local to the project but may later be published
  separately.
- Journal-entry semantics should be separated into distinct dimensions rather
  than collapsed into one status field.
- The current ontology direction uses:
  - `mlg:workflowState` for progress through work
  - `mlg:priority` for importance
  - `mlg:reviewState` for triage concerns such as confirmation or likely
    abandonment
  - `mlg:coordinationState` for waiting, blocking, and delegation
- Canonical workflow values should use short names such as `mlg:Open`,
  `mlg:Scheduled`, `mlg:Active`, and `mlg:Done`.
- UI marker lanes are not one-to-one ontology fields:
  - the triage marker lane may render information derived from `priority` and
    `reviewState`
  - the workflow marker lane renders `workflowState`
  - the coordination marker lane renders `coordinationState`
- Default y-felin symbols may be recorded in the ontology as annotations for
  concepts or classes, but applications remain free to choose different glyphs.

### Configuration

- Configuration should start minimal.
- The initial config should be user-editable and stored in an XDG-style user
  config location.
- Project-local overrides and Pod-synced config are deferred.

### Testing

- Automated testing is a first-class requirement.
- The architecture should support behaviour-focused acceptance testing.
- The default test strategy should be BDD acceptance tests backed by focused
  unit and component tests.

## Known boundaries

- The current implementation cycle should stay narrow and avoid solving the
  full product in one pass.
- Rich query semantics, additional perspectives, sidecars, Pod login flows,
  and broader item types remain out of scope until later steps require them.
- If y-felin needs lower-level local-first or sync capabilities that clearly
  belong in `lofipod`, that work should be considered for the library rather
  than duplicated here.

## Open questions

- What final user-facing terminology should replace or refine `Item` as more
  RDF-backed types appear?
- When should `today` become a real perspective rather than a future concept?
- What shape should the first sidecar take when it is introduced?
- Which future gaps discovered in implementation should move into `lofipod`?
