import type { Dispatch, SetStateAction } from "react";
import { useEffect, useReducer } from "react";
import type { AnyItem, AppStore } from "../core/index.js";
import { itemCapabilities } from "../core/index.js";
import type { HelpMode, InboxItemsState } from "./state.js";
import type { TuiActionId } from "./keymap.js";

type UseTuiActionsOptions = {
  readonly appStore: AppStore;
  readonly exit: () => void;
  readonly helpMode: HelpMode;
  readonly itemsState: InboxItemsState;
  readonly selectedIndex: number;
  readonly setHelpMode: Dispatch<SetStateAction<HelpMode>>;
  readonly setItemsState: Dispatch<SetStateAction<InboxItemsState>>;
  readonly setSelectedIndex: Dispatch<SetStateAction<number>>;
  readonly onBeginCreate: (kind: AnyItem["kind"]) => void;
  readonly onBeginEdit: (item: AnyItem) => void;
};

type ActionQueueState = {
  readonly queue: TuiActionId[];
  readonly processing: boolean;
};

type QueueAction =
  | {
      readonly type: "enqueue";
      readonly actionId: TuiActionId;
    }
  | {
      readonly type: "start";
    }
  | {
      readonly type: "finish";
    };

function queueReducer(state: ActionQueueState, action: QueueAction): ActionQueueState {
  switch (action.type) {
    case "enqueue":
      return {
        queue: [...state.queue, action.actionId],
        processing: state.processing,
      };
    case "start":
      return {
        queue: state.queue.slice(1),
        processing: true,
      };
    case "finish":
      return {
        queue: state.queue,
        processing: false,
      };
  }
}

export function useTuiActions({
  appStore,
  exit,
  helpMode,
  itemsState,
  selectedIndex,
  setHelpMode,
  setItemsState,
  setSelectedIndex,
  onBeginCreate,
  onBeginEdit,
}: UseTuiActionsOptions) {
  const [queueState, enqueueAction] = useReducer(queueReducer, {
    queue: [],
    processing: false,
  });

  useEffect(() => {
    if (queueState.processing || queueState.queue.length === 0) {
      return;
    }

    const actionId = queueState.queue[0];
    enqueueAction({ type: "start" });
    void (async () => {
      try {
        await dispatchAction(actionId);
      } finally {
        enqueueAction({ type: "finish" });
      }
    })();
  }, [queueState.queue, queueState.processing]);

  const dispatchAction = async (actionId: TuiActionId) => {
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
          onBeginCreate("task");
        }
        return;
      case "entry.create.note":
        if (helpMode === "none") {
          onBeginCreate("note");
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
                  item.id === result.value.id ? result.value : item,
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
                  item.id === result.value.id ? result.value : item,
                ),
        }));
        return;
      }
      case "entry.edit":
        if (helpMode !== "none" || !currentItem) {
          return;
        }
        onBeginEdit(currentItem);
        return;
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
  };

  return {
    dispatch(actionId: TuiActionId) {
      enqueueAction({ type: "enqueue", actionId });
    },
  };
}
