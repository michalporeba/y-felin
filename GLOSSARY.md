# Melin Glossary

This file captures the working language for discussing Melin's application design, user interface, and user experience.

The purpose is precision: each term should mean one thing, so we can talk about behavior, layout, and interaction without overloading words like "view".

## Core Terms

### Perspective

The user's current working mode in the application.

A perspective defines what kind of thing the user is trying to do and what information should be emphasized. Examples might later include `inbox`, `today`, or `review`.

A perspective does not define exact screen geometry by itself.

### Layout

The spatial arrangement of visible regions on the terminal.

Examples include a single pane, a main pane with a sidecar, a horizontal split, or a vertical split. Layout is responsive and may change with terminal size.

### Pane

A bounded region of the screen with a specific structural role in the current layout.

In Melin this is likely to include:

- main pane
- sidecar pane
- top bar
- bottom bar

### Panel

A concrete UI unit rendered inside a pane.

Examples include an inbox list panel, an item detail panel, or a capture panel.

A pane is the slot; a panel is what fills it.

### Chrome

The persistent framing UI around the working area.

In Melin this includes the top bar, bottom bar, separators, titles, status indicators, and key hints.

### Screen

The full currently rendered terminal state.

A screen is the combination of perspective, layout, panes, panels, and chrome at one moment.

## Interaction Terms

### Focus

Which interactive element currently receives keyboard input.

Usually this is one list, editor, or input field.

### Selection

Which item is currently highlighted in a list.

Selection is not the same as focus. A list can have selection while focus is elsewhere.

### Mode

A temporary interaction state within a perspective or panel.

Examples include browse mode, capture mode, and edit mode.

Mode affects key behavior, but should stay local and visible.

### Command

A user-invoked operation.

In the TUI this may come from a keypress; in the CLI it comes from arguments.

Examples include create item, edit item, or move selection down.

### Action

The internal application operation behind a command.

This is the shared core concept already used in the codebase.

## Information Terms

### Entry

A user-visible journal item in the broad sense.

In ontology terms this aligns with `mlg:JournalEntry`.

### Item

A UI-level generic word for something shown in a list.

This is useful in conversation, but should stay secondary if ontology language becomes more precise.

### Detail

Secondary information about the selected entry.

This is what a sidecar would commonly show.

### Context

Supporting information that helps interpret the current panel or selection.

Examples include item count, sync status, filter state, and current mode.

## Design Terms

### Look

The visual character of the application.

This includes spacing, borders, density, color, emphasis, and typography style within terminal constraints.

### Feel

The interaction character of the application.

This includes responsiveness, keyboard flow, amount of friction, and clarity of movement and editing.

### Affordance

A visible cue that suggests how something can be used.

Examples include a highlighted selection, footer key hints, or an inline prompt that clearly looks editable.

### Density

How much information is shown in a given space.

This is an important explicit design concern for a terminal application.

## Recommended Melin-Specific Definitions

These are the preferred meanings to use in project discussions.

### Perspective

A task-oriented configuration of content and commands.

It decides what the user is working on, not exactly how it is positioned.

### Layout

The responsive arrangement of panes for the current screen size.

### Pane

A structural region of the screen.

### Panel

The actual rendered content placed in a pane.

### Mode

A temporary input state within a panel.

## What A Perspective Includes

A perspective includes:

- the user goal
- the primary content being shown
- the set of relevant commands
- the default panel composition

A perspective does not include:

- exact split direction or geometry
- low-level visual styling
- temporary mode details such as whether the inline editor is open

## Important Distinction

Avoid using `view` as a primary term unless it is defined very narrowly.

The term is overloaded by:

- MVC and MVVM architecture language
- visual rendering
- user-visible screen
- filtered lens on data

For Melin, `panel` and `screen` are safer than `view`.

## Example Usage

This is a precise way to describe Melin:

Inside the `inbox` perspective, use a single-pane layout by default. The main pane contains the inbox list panel. In capture mode, the same panel shows an inline editor. The chrome should remain minimal.
