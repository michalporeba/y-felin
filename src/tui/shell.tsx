import React, { useEffect, useState } from "react";
import { Box, Text, useInput, useWindowSize } from "ink";
import {
  createAppServices,
  createAppStore,
  describeSyncState,
  getPerspective,
  getPerspectiveHelp,
  type AppServices,
  type ItemKind,
  type AppStore,
  type ItemSummary,
  type PerspectiveHelpDefinition,
  type SyncState,
} from "../core/index.js";
import { resolveShellLayout } from "./layout.js";
import { defaultTuiTheme, fillLine, markerForItemKind } from "./theme.js";

export type TuiShellProps = {
  readonly showTopBar?: boolean;
  readonly showBottomBar?: boolean;
  readonly initialPerspectiveId?: string;
  readonly services?: AppServices;
  readonly store?: AppStore;
  readonly dimensions?: {
    readonly columns: number;
    readonly rows: number;
  };
};

type ComposerState = {
  readonly mode: "idle" | "create" | "edit";
  readonly kind?: ItemKind;
  readonly value: string;
  readonly itemId?: string;
  readonly errorMessage?: string;
};

type HelpMode = "none" | "context" | "global";

export function TuiShell({
  showTopBar = true,
  showBottomBar = true,
  initialPerspectiveId = "inbox",
  services,
  store,
  dimensions,
}: TuiShellProps) {
  const [ownedServices] = useState(() => services ?? createAppServices());
  const [appStore] = useState(() => store ?? createAppStore(ownedServices));
  const windowSize = useWindowSize();
  const columns = dimensions?.columns ?? windowSize.columns;
  const rows = dimensions?.rows ?? windowSize.rows;
  const perspectiveResult = getPerspective(initialPerspectiveId);
  const [itemsState, setItemsState] = useState<{
    readonly status: "loading" | "ready" | "error";
    readonly items: ItemSummary[];
    readonly errorMessage?: string;
  }>({
    status: "loading",
    items: [],
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [helpMode, setHelpMode] = useState<HelpMode>("none");
  const [composer, setComposer] = useState<ComposerState>({
    mode: "idle",
    value: "",
  });
  const [syncState, setSyncState] = useState<SyncState>({
    status: "unconfigured",
    configured: false,
    pendingChanges: 0,
  });

  const loadItems = async (): Promise<ItemSummary[] | null> => {
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

    if (helpMode !== "none") {
      if (key.escape || _input === "\u001B") {
        setHelpMode("none");
        return;
      }

      if (helpMode === "context" && _input === "H") {
        setHelpMode("global");
        return;
      }

      if (helpMode === "global" && _input === "h") {
        setHelpMode("context");
        return;
      }

      return;
    }

    if (_input === "h") {
      setHelpMode("context");
      return;
    }

    if (_input === "H") {
      setHelpMode("global");
      return;
    }

    if (_input === "t") {
      setComposer({
        mode: "create",
        kind: "task",
        value: "",
      });
      return;
    }

    if (_input === "n") {
      setComposer({
        mode: "create",
        kind: "note",
        value: "",
      });
      return;
    }

    if (itemsState.status !== "ready" || itemsState.items.length === 0) {
      return;
    }

    if (_input === "e") {
      const currentItem = itemsState.items[selectedIndex];
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

    if (_input === "j" || key.downArrow) {
      setSelectedIndex((current) =>
        Math.min(current + 1, itemsState.items.length - 1),
      );
    }

    if (_input === "k" || key.upArrow) {
      setSelectedIndex((current) => Math.max(current - 1, 0));
    }
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
}: {
  readonly columns: number;
  readonly height: number;
  readonly perspectiveResult: ReturnType<typeof getPerspective>;
  readonly itemsState: {
    readonly status: "loading" | "ready" | "error";
    readonly items: ItemSummary[];
    readonly errorMessage?: string;
  };
  readonly selectedIndex: number;
  readonly composer: ComposerState;
  readonly helpMode: HelpMode;
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
}: {
  readonly columns: number;
  readonly rows: number;
  readonly itemsState: {
    readonly status: "loading" | "ready" | "error";
    readonly items: ItemSummary[];
    readonly errorMessage?: string;
  };
  readonly selectedIndex: number;
  readonly composer: ComposerState;
  readonly helpMode: HelpMode;
  readonly syncState: SyncState;
}) {
  const focusLabel =
    itemsState.status === "ready" && itemsState.items[selectedIndex]
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
      ? "H full help | Esc close"
      : helpMode === "global"
        ? "h contextual help | Esc close"
      : composer.mode === "idle"
      ? "j/k move | t task | n note | e edit"
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
  }: {
    readonly perspectiveResult: ReturnType<typeof getPerspective>;
    readonly itemsState: {
      readonly status: "loading" | "ready" | "error";
      readonly items: ItemSummary[];
      readonly errorMessage?: string;
    };
    readonly selectedIndex: number;
    readonly composer: ComposerState;
    readonly helpMode: HelpMode;
  },
) {
  const body = renderPerspectiveBody(
    perspectiveResult,
    itemsState,
    selectedIndex,
    composer,
    helpMode,
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
    readonly items: ItemSummary[];
    readonly errorMessage?: string;
  },
  selectedIndex: number,
  composer: ComposerState,
  helpMode: HelpMode,
): React.ReactNode {
  if (!perspectiveResult.ok) {
    return perspectiveResult.error.message;
  }

  if (helpMode === "context") {
    return renderPerspectiveHelp(perspectiveResult.value.id);
  }

  if (helpMode === "global") {
    return <GlobalHelpPanel />;
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
          Press t for a task or n for a note.
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
                {selected ? ">" : " "} {markerForItemKind(item.kind)} {item.title}
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

function renderPerspectiveHelp(perspectiveId: string): React.ReactNode {
  const helpResult = getPerspectiveHelp(perspectiveId);
  if (!helpResult.ok) {
    return helpResult.error.message;
  }

  return <PerspectiveHelpPanel help={helpResult.value} />;
}

function PerspectiveHelpPanel({
  help,
}: {
  readonly help: PerspectiveHelpDefinition;
}) {
  return (
    <Box flexDirection="column" paddingX={2}>
      <Text bold>Actions</Text>
      <Text />
      {help.actions.map((entry) => (
        <Text key={`action-${entry.label}`} wrap="truncate-end">
          {entry.label.padEnd(6, " ")} {entry.description}
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

function GlobalHelpPanel() {
  return (
    <Box flexDirection="column" paddingX={2}>
      <Text bold>Help Levels</Text>
      <Text />
      <Text wrap="truncate-end">h      Open contextual help for the current perspective.</Text>
      <Text wrap="truncate-end">H      Open the main help document.</Text>
      <Text wrap="truncate-end">Esc    Close help and return to the previous perspective.</Text>
      <Text />
      <Text bold>Inbox</Text>
      <Text />
      <Text wrap="truncate-end">j / k  Move the current selection down or up.</Text>
      <Text wrap="truncate-end">t      Create a new task at the bottom of the inbox.</Text>
      <Text wrap="truncate-end">n      Create a new note at the bottom of the inbox.</Text>
      <Text wrap="truncate-end">e      Edit the selected entry title in place.</Text>
    </Box>
  );
}
