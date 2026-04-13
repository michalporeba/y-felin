import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import type { AnyItem, AppStore, SyncState } from "../core/index.js";
import type { ComposerState, TuiInputKey } from "./state.js";

type UseComposerOptions = {
  readonly appStore: AppStore;
  readonly loadItems: () => Promise<AnyItem[] | null>;
  readonly setSelectedIndex: Dispatch<SetStateAction<number>>;
  readonly setSyncState: Dispatch<SetStateAction<SyncState>>;
};

export function useComposer({
  appStore,
  loadItems,
  setSelectedIndex,
  setSyncState,
}: UseComposerOptions) {
  const [composer, setComposer] = useState<ComposerState>({
    mode: "idle",
    value: "",
  });

  const beginCreate = (kind: AnyItem["kind"]) => {
    setComposer({
      mode: "create",
      kind,
      value: "",
    });
  };

  const beginEdit = (item: AnyItem) => {
    setComposer({
      mode: "edit",
      kind: item.kind,
      itemId: item.id,
      value: item.title,
    });
  };

  const handleInput = async (input: string, key: TuiInputKey) => {
    if (key.escape || input === "\u001B") {
      setComposer({
        mode: "idle",
        kind: undefined,
        value: "",
      });
      return;
    }

    if (key.return) {
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
        const index = reloadedItems.findIndex((item) => item.id === result.value.id);
        setSelectedIndex(index >= 0 ? index : 0);
      }
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

    if (input && !key.ctrl && !key.meta) {
      setComposer((current) => ({
        ...current,
        value: `${current.value}${input}`,
        errorMessage: undefined,
      }));
    }
  };

  return {
    beginCreate,
    beginEdit,
    composer,
    handleInput,
    setComposer,
  };
}
