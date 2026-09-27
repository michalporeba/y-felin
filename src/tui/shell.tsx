import React, { useEffect, useMemo, useState } from "react";
import { Box, useApp, useWindowSize } from "ink";
import {
  createAppServices,
  createAppStore,
  getPerspective,
  type AppServices,
  type AppStore,
  type PerspectiveId,
  type SyncState,
} from "../core/index.js";
import { resolveShellLayout } from "./layout.js";
import { compileKeymap, defaultKeymapConfig } from "./keymap.js";
import type { KeymapConfig } from "./keymap.js";
import type { HelpMode } from "./state.js";
import { BottomBar } from "./components/BottomBar.js";
import { MainArea } from "./components/MainArea.js";
import { TopBar } from "./components/TopBar.js";
import { useComposer } from "./useComposer.js";
import { useInboxItems } from "./useInboxItems.js";
import { useTuiKeyboard } from "./useTuiKeyboard.js";
import { useTuiActions } from "./useTuiActions.js";
import { JournalShell } from "./JournalShell.js";
import type { JournalKeymapOverrides } from "./journal-keymap.js";
import { loadJournalUiConfig } from "./journal-config.js";

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
  readonly journalKeymapOverrides?: JournalKeymapOverrides;
  readonly journalDayOrder?: "oldest-first" | "newest-first";
};

export function TuiShell({
  showTopBar = true,
  showBottomBar = true,
  initialPerspectiveId = "journal",
  dataDir,
  services,
  store,
  dimensions,
  keymapConfig = defaultKeymapConfig,
  journalKeymapOverrides,
  journalDayOrder,
}: TuiShellProps) {
  const [ownedServices] = useState(() => services ?? createAppServices({ localStorage: dataDir ? { dataDir } : undefined }));
  const [journalConfig] = useState(() => initialPerspectiveId === "journal" && (!services || dataDir) ? loadJournalUiConfig(dataDir) : {});
  useEffect(() => () => { if (!services) void ownedServices.dispose(); }, [ownedServices, services]);
  if (initialPerspectiveId === "journal") {
    return <JournalShell services={ownedServices} store={store} columns={dimensions?.columns} rows={dimensions?.rows} showTopBar={showTopBar} showBottomBar={showBottomBar} keymapOverrides={journalKeymapOverrides ?? journalConfig.keybindings} dayOrder={journalDayOrder ?? (process.env.Y_FELIN_JOURNAL_ORDER === "newest-first" ? "newest-first" : journalConfig.dayOrder)} />;
  }
  return <InboxShell showTopBar={showTopBar} showBottomBar={showBottomBar} initialPerspectiveId={initialPerspectiveId} dataDir={dataDir} services={ownedServices} store={store} dimensions={dimensions} keymapConfig={keymapConfig} />;
}

function InboxShell({
  showTopBar = true,
  showBottomBar = true,
  initialPerspectiveId = "inbox",
  dataDir,
  services,
  store,
  dimensions,
  keymapConfig = defaultKeymapConfig,
}: TuiShellProps) {
  const [ownedServices] = useState(() => services ?? createAppServices({ localStorage: dataDir ? { dataDir } : undefined }));
  const [appStore] = useState(() => store ?? createAppStore(ownedServices));
  const { exit } = useApp();
  const windowSize = useWindowSize();
  const columns = dimensions?.columns ?? windowSize.columns;
  const rows = dimensions?.rows ?? windowSize.rows;
  const perspectiveResult = getPerspective(initialPerspectiveId);
  const perspectiveId = perspectiveResult.ok ? perspectiveResult.value.id : undefined;
  const activeKeymap = useMemo(() => compileKeymap(keymapConfig, perspectiveId as PerspectiveId | undefined), [keymapConfig, perspectiveId]);
  const [helpMode, setHelpMode] = useState<HelpMode>("none");
  const [syncState, setSyncState] = useState<SyncState>({
    status: "unconfigured",
    configured: false,
    pendingChanges: 0,
    reconciliation: { lastUnsupportedPolicy: null, lastUnsupportedReason: null },
    migration: { lastLocalOutcome: null, lastCanonicalRemoteOutcome: null },
    connection: {
      reachable: false,
      lastSyncedAt: null,
      lastFailedAt: null,
      lastFailureReason: null,
      notificationsActive: false,
    },
  });
  const inbox = useInboxItems(appStore);
  const composer = useComposer({
    appStore,
    loadItems: inbox.loadItems,
    setSelectedIndex: inbox.setSelectedIndex,
    setSyncState,
  });
  const actions = useTuiActions({
    appStore,
    exit,
    helpMode,
    itemsState: inbox.itemsState,
    selectedIndex: inbox.selectedIndex,
    setHelpMode,
    setItemsState: inbox.setItemsState,
    setSelectedIndex: inbox.setSelectedIndex,
    onBeginCreate: composer.beginCreate,
    onBeginEdit: composer.beginEdit,
  });
  useTuiKeyboard({ composer: composer.composer, handleComposerInput: composer.handleInput, helpMode, setHelpMode, activeKeymap, dispatchAction: actions.dispatch });

  useEffect(() => {
    let active = true;
    void (async () => {
      const itemsResult = await inbox.loadItems();
      const syncResult = await appStore.dispatch("sync.state", undefined);
      if (!active) {
        return;
      }

      if (syncResult.ok) {
        setSyncState(syncResult.value);
      }

      if (!itemsResult) {
        return;
      }
    })();

    return () => { active = false; if (!services && !store) void ownedServices.dispose(); };
  }, [appStore, ownedServices, services, store]);

  const layout = resolveShellLayout({
    columns,
    rows,
    showTopBar,
    showBottomBar,
  });

  return (
    <Box flexDirection="column" width={layout.columns} height={layout.rows}>
      {showTopBar ? (
        <TopBar columns={layout.columns} itemCount={inbox.itemsState.items.length} />
      ) : null}
      <MainArea
        columns={layout.columns}
        height={layout.mainHeight}
        perspectiveResult={perspectiveResult}
        itemsState={inbox.itemsState}
        selectedIndex={inbox.selectedIndex}
        composer={composer.composer}
        helpMode={helpMode}
        activeKeymap={activeKeymap}
      />
      {showBottomBar ? (
        <BottomBar
          columns={layout.columns}
          rows={layout.rows}
          itemsState={inbox.itemsState}
          selectedIndex={inbox.selectedIndex}
          composer={composer.composer}
          helpMode={helpMode}
          syncState={syncState}
          activeKeymap={activeKeymap}
        />
      ) : null}
    </Box>
  );
}
