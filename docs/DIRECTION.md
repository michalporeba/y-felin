# Product direction — 26 September 2026

## Decision

Prioritise further development of y-felin. Explore capabilities originally
considered in Ticks, Stuffed, and related personal tools as possible extensions.
The next implementation slice is still to be selected.

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

Bullet journaling remains a useful default experience. It need not determine
every plugin's workflow or be the only way to organise the workspace.

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

Inspect the current perspective registry, application actions, and RDF mappings.
Choose a small vertical extension that preserves the existing local inbox and
tests the modular direction. Checklists are a candidate, not an agreed next
implementation task. Record concrete architecture decisions in ADR.md and the
chosen delivery slice in PLANS.md.

The portfolio decision is also recorded in
`/home/michal/Work/projects-review/DECISIONS.md`.
