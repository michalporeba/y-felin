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
  type AnyItem,
  type Note,
  type PriorityLevel,
  type Task,
  rewindWorkflowState,
  togglePriorityLevel,
  validateItemTitle,
} from "./items.js";
import { appError } from "./errors.js";
import { err, ok, type AppResult } from "./results.js";
import type { SyncState } from "./sync.js";

export type AppServices = {
  readonly perspectives: {
    readonly get: typeof getPerspective;
    readonly list: typeof listPerspectives;
  };
  readonly items: {
    readonly list: (options?: { readonly limit?: number }) => Promise<AnyItem[]>;
    readonly create: (input: {
      readonly kind: AnyItem["kind"];
      readonly title: string;
    }) => Promise<AppResult<AnyItem>>;
    readonly update: (input: {
      readonly id: string;
      readonly title: string;
    }) => Promise<AppResult<AnyItem>>;
    readonly advanceWorkflow: (input: {
      readonly id: string;
    }) => Promise<AnyItem>;
    readonly rewindWorkflow: (input: {
      readonly id: string;
    }) => Promise<AnyItem>;
    readonly togglePriority: (input: {
      readonly id: string;
    }) => Promise<AnyItem>;
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
        const [tasks, notes] = await Promise.all([
          requireLocalEngine().listTasks(),
          requireLocalEngine().listNotes(),
        ]);
        const items = [...tasks, ...notes].sort(compareItemsOldestFirst);
        return options?.limit ? items.slice(0, options.limit) : items;
      },
      async create({ kind, title }) {
        let validatedTitle: string;
        try {
          validatedTitle = validateItemTitle(title);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Invalid item title.";
          return err(appError("invalid_input", message));
        }

        const local = requireLocalEngine();
        const base = {
          id: idGenerator(),
          title: validatedTitle,
          createdAt: now(),
        };

        if (kind === "note") {
          return ok(
            await local.saveNote({
              ...base,
              kind: "note",
            }),
          );
        }

        return ok(
          await local.saveTask({
            ...base,
            kind: "task",
            priority: "normal" as PriorityLevel,
            workflowState: "open",
          }),
        );
      },
      async update({ id, title }) {
        let validatedTitle: string;
        try {
          validatedTitle = validateItemTitle(title);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Invalid item title.";
          return err(appError("invalid_input", message));
        }

        const existing = await getAnyItem(requireLocalEngine(), id);
        if (!existing) {
          return err(appError("not_found", `Unknown item: ${id}`));
        }

        return ok(
          await saveAnyItem(requireLocalEngine(), {
            ...existing,
            title: validatedTitle,
          }),
        );
      },
      async advanceWorkflow({ id }) {
        const existing = await getAnyItem(requireLocalEngine(), id);
        if (!existing) {
          throw new Error(`Unknown item: ${id}`);
        }

        if (existing.kind !== "task") {
          return existing;
        }

        return requireLocalEngine().saveTask({
          ...existing,
          workflowState: advanceWorkflowState(existing.workflowState),
        });
      },
      async rewindWorkflow({ id }) {
        const existing = await getAnyItem(requireLocalEngine(), id);
        if (!existing) {
          throw new Error(`Unknown item: ${id}`);
        }

        if (existing.kind !== "task") {
          return existing;
        }

        return requireLocalEngine().saveTask({
          ...existing,
          workflowState: rewindWorkflowState(existing.workflowState),
        });
      },
      async togglePriority({ id }) {
        const existing = await getAnyItem(requireLocalEngine(), id);
        if (!existing) {
          throw new Error(`Unknown item: ${id}`);
        }

        if (existing.kind !== "task") {
          return existing;
        }

        return saveAnyItem(requireLocalEngine(), {
          ...existing,
          priority: togglePriorityLevel(existing.priority),
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

async function getAnyItem(
  localEngine: YFelinLocalEngine,
  id: string,
): Promise<AnyItem | null> {
  const task = await localEngine.getTask(id);
  if (task) {
    return task;
  }

  return localEngine.getNote(id);
}

function saveAnyItem(
  localEngine: YFelinLocalEngine,
  item: AnyItem,
): Promise<AnyItem> {
  return item.kind === "task"
    ? localEngine.saveTask(item)
    : localEngine.saveNote(item);
}
