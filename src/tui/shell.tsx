import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import {
  createAppServices,
  createAppStore,
  describeSyncState,
  getPerspective,
  getPerspectiveHelp,
  itemCapabilities,
  type AppServices,
  type AppStore,
  type AnyItem,
  type ItemKind,
  type PerspectiveHelpDefinition,
  type PerspectiveHelpEntry,
  type PerspectiveId,
  type SyncState,
} from "../core/index.js";
import { resolveShellLayout } from "./layout.js";
import {
  compileKeymap,
  defaultKeymapConfig,
  getGlobalHelpEntries,
  getPerspectiveActionHelp,
  primaryBindingForAction,
  strokeFromInput,
  type ActionHelpEntry,
  type CompiledKeymap,
  type KeymapConfig,
  type TuiActionId,
} from "./keymap.js";
import {
  defaultTuiTheme,
  fillLine,
  markerForItem,
  priorityMarker,
} from "./theme.js";

export type TuiShellProps = {
  readonly showTopBar?: boolean;
  readonly showBottomBar?: boolean;
  readonly initialPerspectiveId?: string;
  readonly dataDir?: string;
  readonly services?: AppServices;
  readonly store?: AppStore;
  readonly dimensions?: {
    readonly columns: number;
    readonly rows: number;
  };
  readonly keymapConfig?: KeymapConfig;
};

type ComposerState = {
  readonly mode: "idle" | "create" | "edit";
  readonly kind?: AnyItem["kind"];
  readonly value: string;
  readonly itemId?: string;
  readonly errorMessage?: string;
};

type HelpMode = "none" | "context" | "global";

export function TuiShell({
  showTopBar = true,
  showBottomBar = true,
  initialPerspectiveId = "inbox",
  dataDir,
  services,
  store,
  dimensions,
  keymapConfig = defaultKeymapConfig,
}: TuiShellProps) {
  const [ownedServices] = useState(() =>
    services ?? createAppServices({
      localStorage: dataDir ? { dataDir } : undefined,
    }),
  );
  const [appStore] = useState(() => store ?? createAppStore(ownedServices));
  const { exit } = useApp();
  const windowSize = useWindowSize();
  const columns = dimensions?.columns ?? windowSize.columns;
  const rows = dimensions?.rows ?? windowSize.rows;
  const perspectiveResult = getPerspective(initialPerspectiveId);
  const [itemsState, setItemsState] = useState<{
    readonly status: "loading" | "ready" | "error";
    readonly items: AnyItem[];
    readonly errorMessage?: string;
  }>({
    status: "loading",
    items: [],
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [helpMode, setHelpMode] = useState<HelpMode>("none");
  const [pendingSequence, setPendingSequence] = useState("");
  const [composer, setComposer] = useState<ComposerState>({
    mode: "idle",
    value: "",
  });
  const [syncState, setSyncState] = useState<SyncState>({
    status: "unconfigured",
    configured: false,
    pendingChanges: 0,
  });
  const perspectiveId = perspectiveResult.ok
    ? perspectiveResult.value.id
    : undefined;
  const activeKeymap = useMemo(
    () =>
      compileKeymap(
        keymapConfig,
        perspectiveId as PerspectiveId | undefined,
      ),
    [keymapConfig, perspectiveId],
  );

  const loadItems = async (): Promise<AnyItem[] | null> => {
    const result = await appStore.dispatch("items.list", undefined);

    if (!result.ok) {
      setItemsState({
        status: "error",
        items: [],
        errorMessage: result.error.message,
      });
      return null;
    }

    setItemsState({
      status: "ready",
      items: result.value,
    });
    return result.value;
  };

  useEffect(() => {
    let active = true;

    void (async () => {
      const [itemsResult, syncResult] = await Promise.all([
        appStore.dispatch("items.list", undefined),
        appStore.dispatch("sync.state", undefined),
      ]);
      if (!active) {
        return;
      }

      if (syncResult.ok) {
        setSyncState(syncResult.value);
      }

      if (!itemsResult.ok) {
        setItemsState({
          status: "error",
          items: [],
          errorMessage: itemsResult.error.message,
        });
        return;
      }

      setItemsState({
        status: "ready",
        items: itemsResult.value,
      });
    })();

    return () => {
      active = false;
      if (!services && !store) {
        void ownedServices.dispose();
      }
    };
  }, [appStore, ownedServices, services, store]);

  useEffect(() => {
    if (itemsState.items.length === 0) {
      setSelectedIndex(0);
      return;
    }

    setSelectedIndex((current) =>
      Math.min(Math.max(current, 0), itemsState.items.length - 1),
    );
  }, [itemsState.items]);

  useInput((_input, key) => {
    if (composer.mode !== "idle") {
      if (key.escape || _input === "\u001B") {
        setComposer({
          mode: "idle",
          kind: undefined,
          value: "",
        });
        return;
      }

      if (key.return) {
        void (async () => {
          const result =
            composer.mode === "edit" && composer.itemId
      ? await appStore.dispatch("items.update", {
                  id: composer.itemId,
                  title: composer.value,
                })
              : await appStore.dispatch("items.create", {
                  kind: composer.kind ?? "task",
                  title: composer.value,
                });

          if (!result.ok) {
            setComposer((current) => ({
              ...current,
              errorMessage: result.error.message,
            }));
            return;
          }

          setComposer({
            mode: "idle",
            kind: undefined,
            value: "",
          });
          const reloadedItems = await loadItems();
          const nextSyncState = await appStore.dispatch("sync.state", undefined);
          if (nextSyncState.ok) {
            setSyncState(nextSyncState.value);
          }
          if (reloadedItems) {
            const index = reloadedItems.findIndex(
              (item) => item.id === result.value.id,
            );
            setSelectedIndex(index >= 0 ? index : 0);
          }
        })();
        return;
      }

      if (key.backspace || key.delete) {
        setComposer((current) => ({
          ...current,
          value: current.value.slice(0, -1),
          errorMessage: undefined,
        }));
        return;
      }

      if (_input && !key.ctrl && !key.meta) {
        setComposer((current) => ({
          ...current,
          value: `${current.value}${_input}`,
          errorMessage: undefined,
        }));
      }

      return;
    }

    if (key.escape || _input === "\u001B") {
      setPendingSequence("");
      if (helpMode !== "none") {
        setHelpMode("none");
      }
      return;
    }

    const stroke = strokeFromInput(_input, key);
    if (!stroke) {
      return;
    }

    const matchedAction = resolveActionFromStroke(
      stroke,
      pendingSequence,
      activeKeymap,
    );

    if (matchedAction.state === "pending") {
      setPendingSequence(matchedAction.sequence);
      return;
    }

    setPendingSequence(matchedAction.nextPendingSequence);
    if (!matchedAction.actionId) {
      return;
    }

    void dispatchTuiAction({
      actionId: matchedAction.actionId,
      helpMode,
      itemsState,
      selectedIndex,
      appStore,
      exit,
      setComposer,
      setHelpMode,
      setItemsState,
      setSelectedIndex,
    });
  });

  const layout = resolveShellLayout({
    columns,
    rows,
    showTopBar,
    showBottomBar,
  });

  return (
    <Box flexDirection="column" width={layout.columns} height={layout.rows}>
      {showTopBar ? (
        <TopBar columns={layout.columns} itemCount={itemsState.items.length} />
      ) : null}
      <MainArea
        columns={layout.columns}
        height={layout.mainHeight}
        perspectiveResult={perspectiveResult}
        itemsState={itemsState}
        selectedIndex={selectedIndex}
        composer={composer}
        helpMode={helpMode}
        activeKeymap={activeKeymap}
      />
      {showBottomBar ? (
        <BottomBar
          columns={layout.columns}
          rows={layout.rows}
          itemsState={itemsState}
          selectedIndex={selectedIndex}
          composer={composer}
          helpMode={helpMode}
          syncState={syncState}
          activeKeymap={activeKeymap}
        />
      ) : null}
    </Box>
  );
}

function TopBar({
  columns,
  itemCount,
}: {
  readonly columns: number;
  readonly itemCount: number;
}) {
  const line = fillLine(
    ` MELIN | inbox | items ${itemCount} | cols ${columns}`,
    columns,
  );

  return (
    <Box width={columns}>
      <Text {...defaultTuiTheme.topBar} wrap="truncate-end">
        {line}
      </Text>
    </Box>
  );
}

function FullWidthRule({
  columns,
}: {
  readonly columns: number;
}) {
  return (
    <Text dimColor wrap="truncate-end">
      {"-".repeat(Math.max(1, columns))}
    </Text>
  );
}

function MainArea({
  columns,
  height,
  perspectiveResult,
  itemsState,
  selectedIndex,
  composer,
  helpMode,
  activeKeymap,
}: {
  readonly columns: number;
  readonly height: number;
  readonly perspectiveResult: ReturnType<typeof getPerspective>;
  readonly itemsState: {
    readonly status: "loading" | "ready" | "error";
    readonly items: AnyItem[];
    readonly errorMessage?: string;
  };
  readonly selectedIndex: number;
  readonly composer: ComposerState;
  readonly helpMode: HelpMode;
  readonly activeKeymap: CompiledKeymap;
}) {
  return (
    <Box flexDirection="column" width={columns} height={height}>
      <Box marginTop={1} marginBottom={1} paddingX={1}>
        <Text {...defaultTuiTheme.accent} wrap="truncate-end">
          [{renderPaneHeading(perspectiveResult, helpMode)}] main pane | rows {height}
        </Text>
      </Box>
      <FullWidthRule columns={columns} />
      <PerspectiveBody
        perspectiveResult={perspectiveResult}
        itemsState={itemsState}
        selectedIndex={selectedIndex}
        composer={composer}
        helpMode={helpMode}
        activeKeymap={activeKeymap}
      />
    </Box>
  );
}

function BottomBar({
  columns,
  rows,
  itemsState,
  selectedIndex,
  composer,
  helpMode,
  syncState,
  activeKeymap,
}: {
  readonly columns: number;
  readonly rows: number;
  readonly itemsState: {
    readonly status: "loading" | "ready" | "error";
    readonly items: AnyItem[];
    readonly errorMessage?: string;
  };
  readonly selectedIndex: number;
  readonly composer: ComposerState;
  readonly helpMode: HelpMode;
  readonly syncState: SyncState;
  readonly activeKeymap: CompiledKeymap;
}) {
  const focusedItem =
    itemsState.status === "ready" ? itemsState.items[selectedIndex] : undefined;
  const focusLabel =
    focusedItem
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

  return (
    <Box flexDirection="column" width={columns}>
      <FullWidthRule columns={columns} />
      <Box width={columns} paddingX={1}>
        <Text {...defaultTuiTheme.muted} wrap="truncate-end">
          size {columns}x{rows} | {focusLabel} | {composerLabel} | {describeSyncState(
            syncState,
          )} | {keyHints}
        </Text>
      </Box>
    </Box>
  );
}

function renderPerspectiveHeading(
  perspectiveResult: ReturnType<typeof getPerspective>,
): string {
  if (!perspectiveResult.ok) {
    return "Perspective error";
  }

  return perspectiveResult.value.title;
}

function renderPaneHeading(
  perspectiveResult: ReturnType<typeof getPerspective>,
  helpMode: HelpMode,
): string {
  if (helpMode === "context") {
    return `${renderPerspectiveHeading(perspectiveResult)} Help`;
  }

  if (helpMode === "global") {
    return "Help";
  }

  return renderPerspectiveHeading(perspectiveResult);
}

function PerspectiveBody(
  {
    perspectiveResult,
    itemsState,
    selectedIndex,
    composer,
    helpMode,
    activeKeymap,
  }: {
    readonly perspectiveResult: ReturnType<typeof getPerspective>;
    readonly itemsState: {
      readonly status: "loading" | "ready" | "error";
      readonly items: AnyItem[];
      readonly errorMessage?: string;
    };
    readonly selectedIndex: number;
    readonly composer: ComposerState;
    readonly helpMode: HelpMode;
    readonly activeKeymap: CompiledKeymap;
  },
) {
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
  perspectiveResult: ReturnType<typeof getPerspective>,
  itemsState: {
    readonly status: "loading" | "ready" | "error";
    readonly items: AnyItem[];
    readonly errorMessage?: string;
  },
  selectedIndex: number,
  composer: ComposerState,
  helpMode: HelpMode,
  activeKeymap: CompiledKeymap,
): React.ReactNode {
  if (!perspectiveResult.ok) {
    return perspectiveResult.error.message;
  }

  if (helpMode === "context") {
    return renderPerspectiveHelp(perspectiveResult.value.id, activeKeymap);
  }

  if (helpMode === "global") {
    return (
      <GlobalHelpPanel
        perspectiveId={perspectiveResult.value.id}
        activeKeymap={activeKeymap}
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

function renderItemPrefix(
  item: AnyItem,
  selected: boolean,
): string {
  const active = selected ? ">" : " ";
  const spacer = " ";
  const priority =
    item.kind === "task" ? priorityMarker({ priority: item.priority }) : " ";
  const main = markerForItem(item);
  const secondary = " ";
  const trailing = " ";

  return `${active}${spacer}${priority}${main}${secondary}${trailing}`;
}

function renderPerspectiveHelp(
  perspectiveId: PerspectiveId,
  keymap: CompiledKeymap,
): React.ReactNode {
  const helpResult = getPerspectiveHelp(perspectiveId);
  if (!helpResult.ok) {
    return helpResult.error.message;
  }

  return (
    <PerspectiveHelpPanel
      help={helpResult.value}
      keymap={keymap}
      perspectiveId={perspectiveId}
    />
  );
}

function PerspectiveHelpPanel({
  help,
  keymap,
  perspectiveId,
}: {
  readonly help: PerspectiveHelpDefinition;
  readonly keymap: CompiledKeymap;
  readonly perspectiveId: PerspectiveId;
}) {
  const actionEntries = renderActionHelpEntries(
    getPerspectiveActionHelp(perspectiveId),
    keymap,
  );

  return (
    <Box flexDirection="column" paddingX={2}>
      <Text bold>Actions</Text>
      <Text />
      {actionEntries.map((entry) => (
        <Text key={`action-${entry.label}`} wrap="truncate-end">
          {entry.label.padEnd(10, " ")} {entry.description}
        </Text>
      ))}
      <Text />
      <Text bold>Symbols</Text>
      <Text />
      {help.symbols.map((entry) => (
        <Text key={`symbol-${entry.label}`} wrap="truncate-end">
          {entry.label.padEnd(6, " ")} {entry.description}
        </Text>
      ))}
    </Box>
  );
}

function GlobalHelpPanel({
  perspectiveId,
  activeKeymap,
}: {
  readonly perspectiveId: PerspectiveId;
  readonly activeKeymap: CompiledKeymap;
}) {
  const globalEntries = renderActionHelpEntries(
    getGlobalHelpEntries(),
    activeKeymap,
  );
  const perspectiveEntries = renderActionHelpEntries(
    getPerspectiveActionHelp(perspectiveId),
    activeKeymap,
  );

  return (
    <Box flexDirection="column" paddingX={2}>
      <Text bold>Help Levels</Text>
      <Text />
      {globalEntries.map((entry) => (
        <Text key={`global-${entry.label}`} wrap="truncate-end">
          {entry.label.padEnd(10, " ")} {entry.description}
        </Text>
      ))}
      <Text wrap="truncate-end">Esc    Close help and return to the previous perspective.</Text>
      <Text />
      <Text bold>{perspectiveId[0]!.toUpperCase() + perspectiveId.slice(1)}</Text>
      <Text />
      {perspectiveEntries.map((entry) => (
        <Text key={`perspective-${entry.label}`} wrap="truncate-end">
          {entry.label.padEnd(10, " ")} {entry.description}
        </Text>
      ))}
    </Box>
  );
}

function renderActionHelpEntries(
  entries: readonly ActionHelpEntry[],
  keymap: CompiledKeymap,
): PerspectiveHelpEntry[] {
  return entries.flatMap((entry) => {
    const label = primaryBindingForAction(keymap, entry.actionId);
    if (!label) {
      return [];
    }

    return [{ label, description: entry.description }];
  });
}

function renderEmptyInboxHint(keymap: CompiledKeymap): string {
  const taskBinding = primaryBindingForAction(keymap, "entry.create.task");
  const noteBinding = primaryBindingForAction(keymap, "entry.create.note");
  if (taskBinding && noteBinding) {
    return `Press ${taskBinding} for a task or ${noteBinding} for a note.`;
  }

  return "Use the configured create bindings to add a task or note.";
}

function buildHintLine(
  keymap: CompiledKeymap,
  actionIds: readonly TuiActionId[],
  focusedKind?: ItemKind,
  extraHints: readonly string[] = [],
): string {
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
  focusedKind?: ItemKind,
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

function resolveActionFromStroke(
  stroke: string,
  pendingSequence: string,
  keymap: CompiledKeymap,
): {
  readonly state: "matched" | "pending" | "unmatched";
  readonly actionId?: TuiActionId;
  readonly sequence: string;
  readonly nextPendingSequence: string;
} {
  const attempt = pendingSequence ? `${pendingSequence} ${stroke}` : stroke;

  if (keymap.bindings.has(attempt)) {
    return {
      state: "matched",
      actionId: keymap.bindings.get(attempt),
      sequence: attempt,
      nextPendingSequence: "",
    };
  }

  if (keymap.prefixes.has(attempt)) {
    return {
      state: "pending",
      sequence: attempt,
      nextPendingSequence: attempt,
    };
  }

  if (pendingSequence && keymap.bindings.has(stroke)) {
    return {
      state: "matched",
      actionId: keymap.bindings.get(stroke),
      sequence: stroke,
      nextPendingSequence: "",
    };
  }

  if (pendingSequence && keymap.prefixes.has(stroke)) {
    return {
      state: "pending",
      sequence: stroke,
      nextPendingSequence: stroke,
    };
  }

  return {
    state: "unmatched",
    sequence: attempt,
    nextPendingSequence: "",
  };
}

async function dispatchTuiAction({
  actionId,
  helpMode,
  itemsState,
  selectedIndex,
  appStore,
  exit,
  setComposer,
  setHelpMode,
  setItemsState,
  setSelectedIndex,
}: {
  readonly actionId: TuiActionId;
  readonly helpMode: HelpMode;
  readonly itemsState: {
    readonly status: "loading" | "ready" | "error";
    readonly items: AnyItem[];
    readonly errorMessage?: string;
  };
  readonly selectedIndex: number;
  readonly appStore: AppStore;
  readonly exit: () => void;
  readonly setComposer: React.Dispatch<React.SetStateAction<ComposerState>>;
  readonly setHelpMode: React.Dispatch<React.SetStateAction<HelpMode>>;
  readonly setItemsState: React.Dispatch<
    React.SetStateAction<{
      readonly status: "loading" | "ready" | "error";
      readonly items: AnyItem[];
      readonly errorMessage?: string;
    }>
  >;
  readonly setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
}) {
  const currentItem =
    itemsState.status === "ready" ? itemsState.items[selectedIndex] : undefined;

  switch (actionId) {
    case "app.quit":
      exit();
      return;
    case "help.context":
      setHelpMode("context");
      return;
    case "help.global":
      setHelpMode("global");
      return;
    case "entry.create.task":
      if (helpMode === "none") {
        setComposer({ mode: "create", kind: "task", value: "" });
      }
      return;
    case "entry.create.note":
      if (helpMode === "none") {
        setComposer({ mode: "create", kind: "note", value: "" });
      }
      return;
    case "entry.workflow.previous":
    case "entry.workflow.next": {
      if (helpMode !== "none" || itemsState.status !== "ready") {
        return;
      }
      if (!currentItem || !itemCapabilities[currentItem.kind].workflow) {
        return;
      }
      const result = await appStore.dispatch(
        actionId === "entry.workflow.next"
          ? "items.workflow.next"
          : "items.workflow.previous",
        { id: currentItem.id },
      );
      if (!result.ok) {
        return;
      }
      setItemsState((current) => ({
        ...current,
        items:
          current.status !== "ready"
            ? current.items
            : current.items.map((item) =>
                item.id === result.value.id ? result.value : item
              ),
      }));
      return;
    }
    case "entry.priority.toggle": {
      if (helpMode !== "none" || itemsState.status !== "ready") {
        return;
      }
      if (!currentItem || !itemCapabilities[currentItem.kind].priority) {
        return;
      }
      const result = await appStore.dispatch("items.priority.toggle", {
        id: currentItem.id,
      });
      if (!result.ok) {
        return;
      }
      setItemsState((current) => ({
        ...current,
        items:
          current.status !== "ready"
            ? current.items
            : current.items.map((item) =>
                item.id === result.value.id ? result.value : item
              ),
      }));
      return;
    }
    case "entry.edit": {
      if (helpMode !== "none") {
        return;
      }
      const currentItem =
        itemsState.status === "ready" ? itemsState.items[selectedIndex] : undefined;
      if (!currentItem) {
        return;
      }
      setComposer({
        mode: "edit",
        kind: currentItem.kind,
        itemId: currentItem.id,
        value: currentItem.title,
      });
      return;
    }
    case "cursor.down":
      if (helpMode === "none" && itemsState.status === "ready") {
        setSelectedIndex((current) =>
          Math.min(current + 1, itemsState.items.length - 1),
        );
      }
      return;
    case "cursor.up":
      if (helpMode === "none" && itemsState.status === "ready") {
        setSelectedIndex((current) => Math.max(current - 1, 0));
      }
      return;
  }
}
