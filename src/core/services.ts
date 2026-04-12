import crypto from "node:crypto";
import {
  createLocalEngine,
  type LocalStorageConfigInput,
  type YFelinLocalEngine,
} from "../local/index.js";
import { getPerspective, listPerspectives } from "./perspectives.js";
import {
  advanceWorkflowState,
  compareItemsOldestFirst,
  type ItemKind,
  type ItemSummary,
  type PriorityLevel,
  rewindWorkflowState,
  type WorkflowState,
} from "./items.js";
import type { SyncState } from "./sync.js";

export type AppServices = {
  readonly perspectives: {
    readonly get: typeof getPerspective;
    readonly list: typeof listPerspectives;
  };
  readonly items: {
    readonly list: (options?: { readonly limit?: number }) => Promise<ItemSummary[]>;
    readonly create: (input: {
      readonly kind: ItemKind;
      readonly title: string;
    }) => Promise<ItemSummary>;
    readonly update: (input: {
      readonly id: string;
      readonly title: string;
    }) => Promise<ItemSummary>;
    readonly advanceWorkflow: (input: {
      readonly id: string;
    }) => Promise<ItemSummary>;
    readonly rewindWorkflow: (input: {
      readonly id: string;
    }) => Promise<ItemSummary>;
    readonly togglePriority: (input: {
      readonly id: string;
    }) => Promise<ItemSummary>;
  };
  readonly sync: {
    readonly state: () => Promise<SyncState>;
  };
  readonly dispose: () => Promise<void>;
};

export type AppServicesInput = {
  readonly localStorage?: LocalStorageConfigInput;
  readonly localEngine?: YFelinLocalEngine;
  readonly idGenerator?: () => string;
  readonly now?: () => string;
};

export function createAppServices(input: AppServicesInput = {}): AppServices {
  let localEngine = input.localEngine;
  const idGenerator = input.idGenerator ?? (() => crypto.randomUUID());
  const now = input.now ?? (() => new Date().toISOString());

  const requireLocalEngine = (): YFelinLocalEngine => {
    if (!localEngine) {
      localEngine = createLocalEngine(input.localStorage);
    }

    return localEngine;
  };

  return {
    perspectives: {
      get: getPerspective,
      list: listPerspectives,
    },
    items: {
      async list(options) {
        const items = await requireLocalEngine().listItems(options);
        return [...items].sort(compareItemsOldestFirst);
      },
      async create({ kind, title }) {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
          throw new Error("Item title cannot be empty.");
        }

        return requireLocalEngine().saveItem({
          id: idGenerator(),
          kind,
          title: trimmedTitle,
          createdAt: now(),
          priority: "normal",
          workflowState: defaultWorkflowState(kind),
        });
      },
      async update({ id, title }) {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
          throw new Error("Item title cannot be empty.");
        }

        const existing = await requireLocalEngine().getItem(id);
        if (!existing) {
          throw new Error(`Unknown item: ${id}`);
        }

        return requireLocalEngine().saveItem({
          ...existing,
          title: trimmedTitle,
        });
      },
      async advanceWorkflow({ id }) {
        const existing = await requireLocalEngine().getItem(id);
        if (!existing) {
          throw new Error(`Unknown item: ${id}`);
        }

        if (existing.kind !== "task" || !existing.workflowState) {
          return existing;
        }

        return requireLocalEngine().saveItem({
          ...existing,
          workflowState: advanceWorkflowState(existing.workflowState),
        });
      },
      async rewindWorkflow({ id }) {
        const existing = await requireLocalEngine().getItem(id);
        if (!existing) {
          throw new Error(`Unknown item: ${id}`);
        }

        if (existing.kind !== "task" || !existing.workflowState) {
          return existing;
        }

        return requireLocalEngine().saveItem({
          ...existing,
          workflowState: rewindWorkflowState(existing.workflowState),
        });
      },
      async togglePriority({ id }) {
        const existing = await requireLocalEngine().getItem(id);
        if (!existing) {
          throw new Error(`Unknown item: ${id}`);
        }

        return requireLocalEngine().saveItem({
          ...existing,
          priority: existing.priority === "high" ? "normal" : "high",
        });
      },
    },
    sync: {
      state() {
        return requireLocalEngine().syncState();
      },
    },
    async dispose() {
      if (!localEngine) {
        return;
      }

      await localEngine.dispose();
    },
  };
}

function defaultWorkflowState(kind: ItemKind): WorkflowState | undefined {
  return kind === "task" ? "open" : undefined;
}
