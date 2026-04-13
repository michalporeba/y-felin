import React from "react";
import { Box, Text } from "ink";
import { getPerspective, type AnyItem } from "../../core/index.js";
import { defaultTuiTheme, markerForItem, priorityMarker } from "../theme.js";
import {
  primaryBindingForAction,
  type CompiledKeymap,
} from "../keymap.js";
import type { ComposerState, HelpMode, InboxItemsState } from "../state.js";
import { HelpPanel } from "./HelpPanel.js";

type PerspectiveResult = ReturnType<typeof getPerspective>;

type PerspectiveBodyProps = {
  readonly perspectiveResult: PerspectiveResult;
  readonly itemsState: InboxItemsState;
  readonly selectedIndex: number;
  readonly composer: ComposerState;
  readonly helpMode: HelpMode;
  readonly activeKeymap: CompiledKeymap;
};

export function PerspectiveBody({
  perspectiveResult,
  itemsState,
  selectedIndex,
  composer,
  helpMode,
  activeKeymap,
}: PerspectiveBodyProps) {
  const body = renderPerspectiveBody(
    perspectiveResult,
    itemsState,
    selectedIndex,
    composer,
    helpMode,
    activeKeymap,
  );

  if (typeof body === "string") {
    return <Text wrap="wrap">{body}</Text>;
  }

  return body;
}

function renderPerspectiveBody(
  perspectiveResult: PerspectiveResult,
  itemsState: InboxItemsState,
  selectedIndex: number,
  composer: ComposerState,
  helpMode: HelpMode,
  activeKeymap: CompiledKeymap,
): React.ReactNode {
  if (!perspectiveResult.ok) {
    return perspectiveResult.error.message;
  }

  if (helpMode === "context" || helpMode === "global") {
    return (
      <HelpPanel
        mode={helpMode}
        perspectiveId={perspectiveResult.value.id}
        keymap={activeKeymap}
      />
    );
  }

  if (itemsState.status === "loading") {
    return "Loading inbox...";
  }

  if (itemsState.status === "error") {
    return itemsState.errorMessage ?? "Failed to load inbox.";
  }

  if (itemsState.items.length === 0) {
    return (
      <Box flexDirection="column" paddingX={2}>
        <Text>{perspectiveResult.value.summary}</Text>
        {composer.mode === "create" ? (
          <Text {...defaultTuiTheme.accent} wrap="truncate-end">
            {renderComposerLine(composer)}
          </Text>
        ) : null}
        {composer.errorMessage ? (
          <Text {...defaultTuiTheme.error} wrap="truncate-end">
            {composer.errorMessage}
          </Text>
        ) : null}
        <Text {...defaultTuiTheme.muted}>Inbox is empty.</Text>
        <Text {...defaultTuiTheme.muted}>
          {renderEmptyInboxHint(activeKeymap)}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={2}>
      {itemsState.items.map((item, index) => {
        const selected = index === selectedIndex;
        const showEditRow = composer.mode === "edit" && composer.itemId === item.id;

        return (
          <React.Fragment key={item.id}>
            {showEditRow ? (
              <Text {...defaultTuiTheme.accent} wrap="truncate-end">
                {renderComposerLine(composer)}
              </Text>
            ) : (
              <Text
                {...(selected ? defaultTuiTheme.selected : defaultTuiTheme.text)}
                wrap="truncate-end"
              >
                {renderItemPrefix(item, selected)}{item.title}
              </Text>
            )}
            {showEditRow && composer.errorMessage ? (
              <Text {...defaultTuiTheme.error} wrap="truncate-end">
                {composer.errorMessage}
              </Text>
            ) : null}
          </React.Fragment>
        );
      })}
      {composer.mode === "create" ? (
        <>
          <Text {...defaultTuiTheme.accent} wrap="truncate-end">
            {renderComposerLine(composer)}
          </Text>
          {composer.errorMessage ? (
            <Text {...defaultTuiTheme.error} wrap="truncate-end">
              {composer.errorMessage}
            </Text>
          ) : null}
        </>
      ) : null}
    </Box>
  );
}

function renderComposerLine(composer: ComposerState): string {
  const kindLabel = composer.kind ?? "task";
  const promptLabel =
    composer.mode === "edit" ? `edit ${kindLabel}` : `new ${kindLabel}`;
  return `${promptLabel}> ${composer.value}_`;
}

function renderItemPrefix(item: AnyItem, selected: boolean): string {
  const active = selected ? ">" : " ";
  const spacer = " ";
  const priority =
    item.kind === "task" ? priorityMarker({ priority: item.priority }) : " ";
  const main = markerForItem(item);
  const secondary = " ";
  const trailing = " ";

  return `${active}${spacer}${priority}${main}${secondary}${trailing}`;
}

function renderEmptyInboxHint(keymap: CompiledKeymap): string {
  const taskBinding = primaryBindingForAction(keymap, "entry.create.task");
  const noteBinding = primaryBindingForAction(keymap, "entry.create.note");
  if (taskBinding && noteBinding) {
    return `Press ${taskBinding} for a task or ${noteBinding} for a note.`;
  }

  return "Use the configured create bindings to add a task or note.";
}
