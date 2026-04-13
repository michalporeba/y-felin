import { useEffect, useState } from "react";
import type { AnyItem, AppStore } from "../core/index.js";
import type { InboxItemsState } from "./state.js";

export function useInboxItems(appStore: AppStore) {
  const [itemsState, setItemsState] = useState<InboxItemsState>({
    status: "loading",
    items: [],
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

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
    if (itemsState.items.length === 0) {
      setSelectedIndex(0);
      return;
    }

    setSelectedIndex((current) =>
      Math.min(Math.max(current, 0), itemsState.items.length - 1),
    );
  }, [itemsState.items]);

  return {
    itemsState,
    loadItems,
    selectedIndex,
    setItemsState,
    setSelectedIndex,
  };
}
