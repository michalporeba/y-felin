# Product direction — 26 September 2026

## Decision

Prioritise further development of y-felin. Explore capabilities originally
considered in Ticks, Stuffed, and related personal tools as possible extensions.
The immediate milestone is a genuinely usable bullet journal, before adding
checklists, inventory, or a general plugin platform.

This records the direction agreed during the portfolio review. It describes
intended evolution, not functionality already delivered.

## Y-felin and the wider ecosystem

Y-felin should provide a convenient integrated workspace over user-owned personal
information. Independent applications should also be able to work with compatible
RDF data in Solid Pods without depending on y-felin or its plugin system.
Local-first persistence and Pod synchronisation should use lofipod within its
supported scope; shared data semantics remain an application-level concern.

The intended TUI direction is a modular host, analogous to an editor hosting
plugins. Different plugins may offer alternative or complementary interfaces
for the same functionality and records. Independent applications may overlap
with those plugins without sharing their code or implementation language.

Bullet journaling is the central product experience and the first functionality
to implement and refine for everyday use. It need not determine every future
plugin's workflow or be the only way to organise the workspace.

### Priority clarification — 27 September 2026

Perfect the journal workflow before expanding into Ticks, Stuffed, or other
capabilities. Prefer a keyboard-first interaction model inspired by Neovim:
distinct navigation and text-editing flows, and composable keystrokes. A leader
may be useful but should not be required for routine work. Subsequent discussion
settled the first workflow, capture grammar, explicit details panes, and autosave
without undo. [JOURNAL_IMPLEMENTATION.md](JOURNAL_IMPLEMENTATION.md) is the current
coding-agent brief; it supersedes conflicting proposals in the earlier backlog.

## Two separate contracts

- **Host/plugin contract:** how views, commands, navigation, focus, keybindings,
  and record-opening handlers participate in the y-felin TUI.
- **Shared data conventions:** how compatible applications identify, discover,
  interpret, and safely edit records while preserving information they do not
  understand. RDF alone does not settle these behavioural agreements.

An independent application only needs the relevant data conventions. A y-felin
plugin also needs the host contract. Multiple plugins for one capability should
be possible, with a way to choose preferred views or alternative handlers.

Establish small conventions through real workflows and interoperability checks.
Do not require a universal ontology or public plugin marketplace before a useful
next slice. Runtime loading, packaging, trust boundaries, and distribution remain
open design questions.

## Interfaces

The user values CLI and TUI interaction and keyboard control. The wider ecosystem
should also support approachable mobile and laptop web interfaces, potentially
through a PWA. Keep domain behaviour independent of presentation so those
interfaces can participate over time.

The present executable remains TUI-first and TUI-only. This direction does not
require implementing CLI, mobile, and web interfaces simultaneously, or changing
the current local-first delivery constraints.

## Candidate capabilities

- **Ticks / checklists:** reusable personal checklists for packing, equipment,
  household maintenance, routine tasks, and activity preparation; broader than
  volunteering or habit tracking. Distinguish templates from individual runs.
- **Stuffed / inventory:** quantities, locations, perishable supplies, and related
  follow-up actions.
- **CPD records:** learning activities, qualifications, reflections, and evidence,
  connected to everyday planning and journaling where useful.
- **Calibrate:** a distinct structured assessment application that can use linked
  evidence without needing to be absorbed into y-felin.

These relationships do not imply that earlier repositories have already merged
or that all capabilities should be implemented as one application.

## Next planning step

Implement [JOURNAL_IMPLEMENTATION.md](JOURNAL_IMPLEMENTATION.md) in tested slices.
The journal itself is the initial capture surface; a separate inbox and future
views are deferred. Validate the journal
through actual use before choosing a second capability. Record concrete
architecture decisions in ADR.md and delivery progress in PLANS.md.

The portfolio decision is also recorded in
`/home/michal/Work/projects-review/DECISIONS.md`.
