import React, { useEffect, useState } from "react";
import { Box, Text, useInput, useWindowSize } from "ink";
import {
  createAppServices,
  createAppStore,
  describeSyncState,
  getPerspective,
  type AppServices,
  type AppStore,
  type ItemSummary,
  type SyncState,
} from "../core/index.js";
import { resolveShellLayout } from "./layout.js";

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
  const [composer, setComposer] = useState<{
    readonly mode: "idle" | "create" | "edit";
    readonly value: string;
    readonly itemId?: string;
    readonly errorMessage?: string;
  }>({
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

    if (_input === "a" || _input === "i" || _input === "c") {
      setComposer({
        mode: "create",
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
      />
      {showBottomBar ? (
        <BottomBar
          columns={layout.columns}
          rows={layout.rows}
          itemsState={itemsState}
          selectedIndex={selectedIndex}
          composer={composer}
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
  return (
    <Box width={columns}>
      <Box width={columns} paddingX={1}>
        <Text
          backgroundColor="white"
          color="black"
          bold
          wrap="truncate-end"
        >
          MELIN | inbox | items {itemCount} | cols {columns}
        </Text>
      </Box>
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
  readonly composer: {
    readonly mode: "idle" | "create" | "edit";
    readonly value: string;
    readonly itemId?: string;
    readonly errorMessage?: string;
  };
}) {
  return (
    <Box flexDirection="column" width={columns} height={height}>
      <Box marginTop={1} marginBottom={1} paddingX={1}>
        <Text bold color="cyan" wrap="truncate-end">
          [{renderPerspectiveHeading(perspectiveResult)}] main pane | rows {height}
        </Text>
      </Box>
      <FullWidthRule columns={columns} />
      <ComposerBlock composer={composer} />
      <PerspectiveBody
        perspectiveResult={perspectiveResult}
        itemsState={itemsState}
        selectedIndex={selectedIndex}
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
  readonly composer: {
    readonly mode: "idle" | "create" | "edit";
    readonly value: string;
    readonly itemId?: string;
    readonly errorMessage?: string;
  };
  readonly syncState: SyncState;
}) {
  const focusLabel =
    itemsState.status === "ready" && itemsState.items[selectedIndex]
      ? `Focus: ${selectedIndex + 1}/${itemsState.items.length}`
      : "Focus: none";
  const composerLabel =
    composer.mode === "idle"
      ? "Editor: idle"
      : composer.mode === "edit"
        ? "Editor: edit"
        : "Editor: create";

  return (
    <Box flexDirection="column" width={columns}>
      <FullWidthRule columns={columns} />
      <Box width={columns} paddingX={1}>
        <Text dimColor wrap="truncate-end">
          size {columns}x{rows} | {focusLabel} | {composerLabel} | {describeSyncState(
            syncState,
          )} | j/k move | a add | e edit
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

function ComposerBlock({
  composer,
}: {
  readonly composer: {
    readonly mode: "idle" | "create" | "edit";
    readonly value: string;
    readonly itemId?: string;
    readonly errorMessage?: string;
  };
}) {
  if (composer.mode === "idle") {
    return null;
  }

  return (
    <Box flexDirection="column" marginBottom={1} paddingX={2}>
      <Text color={composer.mode === "edit" ? "cyan" : "green"}>
        {composer.mode === "edit" ? "Edit" : "Capture"} &gt; {composer.value}
      </Text>
      <Text color={composer.errorMessage ? "red" : "yellow"}>
        {composer.errorMessage ??
          (composer.mode === "edit"
            ? "Enter to save changes, Esc to cancel."
            : "Enter to save, Esc to cancel.")}
      </Text>
    </Box>
  );
}

function PerspectiveBody(
  {
    perspectiveResult,
    itemsState,
    selectedIndex,
  }: {
    readonly perspectiveResult: ReturnType<typeof getPerspective>;
    readonly itemsState: {
      readonly status: "loading" | "ready" | "error";
      readonly items: ItemSummary[];
      readonly errorMessage?: string;
    };
    readonly selectedIndex: number;
  },
) {
  const body = renderPerspectiveBody(perspectiveResult, itemsState, selectedIndex);

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
): React.ReactNode {
  if (!perspectiveResult.ok) {
    return perspectiveResult.error.message;
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
        <Text dimColor>Inbox is empty.</Text>
        <Text dimColor>Press a to capture your first entry.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={2}>
      {itemsState.items.map((item, index) => {
        const selected = index === selectedIndex;

        return (
          <Text
            key={item.id}
            inverse={selected}
            color={selected ? "white" : "gray"}
            backgroundColor={selected ? "blue" : undefined}
            wrap="truncate-end"
          >
            {selected ? ">" : " "} {item.title} ({item.createdAt})
          </Text>
        );
      })}
    </Box>
  );
}
