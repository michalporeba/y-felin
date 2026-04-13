import { Box, Text } from "ink";
import {
  itemCapabilities,
  type AnyItem,
  type SyncState,
} from "../../core/index.js";
import { defaultTuiTheme } from "../theme.js";
import type { CompiledKeymap, TuiActionId } from "../keymap.js";
import type { ComposerState, HelpMode, InboxItemsState } from "../state.js";
import { primaryBindingForAction } from "../keymap.js";

type BottomBarProps = {
  readonly columns: number;
  readonly rows: number;
  readonly itemsState: InboxItemsState;
  readonly selectedIndex: number;
  readonly composer: ComposerState;
  readonly helpMode: HelpMode;
  readonly syncState: SyncState;
  readonly activeKeymap: CompiledKeymap;
};

export function BottomBar({
  columns,
  rows,
  itemsState,
  selectedIndex,
  composer,
  helpMode,
  syncState,
  activeKeymap,
}: BottomBarProps) {
  const focusedItem =
    itemsState.status === "ready" ? itemsState.items[selectedIndex] : undefined;
  const focusLabel = focusedItem
    ? `Focus: ${selectedIndex + 1}/${itemsState.items.length}`
    : "Focus: none";
  const composerLabel =
    helpMode !== "none"
      ? "Editor: help"
      : composer.mode === "idle"
        ? "Editor: idle"
        : composer.mode === "edit"
          ? `Editor: edit ${composer.kind ?? "task"}`
          : `Editor: new ${composer.kind ?? "task"}`;
  const keyHints =
    helpMode === "context"
      ? buildHintLine(activeKeymap, ["help.global"], undefined, ["Esc close"])
      : helpMode === "global"
        ? buildHintLine(activeKeymap, ["help.context"], undefined, ["Esc close"])
        : composer.mode === "idle"
          ? buildHintLine(activeKeymap, [
              "cursor.up",
              "cursor.down",
              "entry.workflow.previous",
              "entry.workflow.next",
              "entry.priority.toggle",
              "entry.create.task",
              "entry.create.note",
              "entry.edit",
              "help.context",
              "app.quit",
            ], focusedItem?.kind)
          : composer.mode === "edit"
            ? "editing"
            : `creating ${composer.kind ?? "task"}`;
  const syncLabel = syncState.configured
    ? `sync ${syncState.status} | pending ${syncState.pendingChanges}`
    : `sync local-only | pending ${syncState.pendingChanges}`;

  return (
    <Box flexDirection="column" width={columns}>
      <FullWidthRule columns={columns} />
      <Box width={columns} paddingX={1}>
        <Text {...defaultTuiTheme.muted} wrap="truncate-end">
          size {columns}x{rows} | {focusLabel} | {composerLabel} | {syncLabel} | {keyHints}
        </Text>
      </Box>
    </Box>
  );
}

function FullWidthRule({ columns }: { readonly columns: number }) {
  return (
    <Text dimColor wrap="truncate-end">
      {"-".repeat(Math.max(1, columns))}
    </Text>
  );
}

function buildHintLine(
  keymap: CompiledKeymap,
  actionIds: readonly TuiActionId[],
  focusedKind?: AnyItem["kind"],
  extraHints: readonly string[] = [],
) {
  const hints = actionIds.flatMap((actionId) => {
    if (!shouldShowHintForAction(actionId, focusedKind)) {
      return [];
    }

    const binding = primaryBindingForAction(keymap, actionId);
    if (!binding) {
      return [];
    }

    return [`${binding} ${shortHintForAction(actionId)}`];
  });

  return [...hints, ...extraHints].join(" | ");
}

function shouldShowHintForAction(
  actionId: TuiActionId,
  focusedKind?: AnyItem["kind"],
): boolean {
  if (!focusedKind) {
    return !isItemMutatingAction(actionId);
  }

  switch (actionId) {
    case "entry.workflow.previous":
    case "entry.workflow.next":
      return itemCapabilities[focusedKind].workflow;
    case "entry.priority.toggle":
      return itemCapabilities[focusedKind].priority;
    default:
      return true;
  }
}

function isItemMutatingAction(actionId: TuiActionId): boolean {
  switch (actionId) {
    case "entry.workflow.previous":
    case "entry.workflow.next":
    case "entry.priority.toggle":
    case "entry.create.task":
    case "entry.create.note":
    case "entry.edit":
      return true;
    default:
      return false;
  }
}

function shortHintForAction(actionId: TuiActionId): string {
  switch (actionId) {
    case "cursor.up":
      return "up";
    case "cursor.down":
      return "down";
    case "entry.create.task":
      return "task";
    case "entry.create.note":
      return "note";
    case "entry.workflow.previous":
      return "left";
    case "entry.workflow.next":
      return "right";
    case "entry.priority.toggle":
      return "priority";
    case "entry.edit":
      return "edit";
    case "help.context":
      return "help";
    case "help.global":
      return "full help";
    case "app.quit":
      return "quit";
  }

  return actionId;
}
