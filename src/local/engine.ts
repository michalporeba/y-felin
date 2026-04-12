import { createEngine, type Engine } from "lofipod";
import { createSqliteStorage } from "lofipod/node";
import { ItemEntity, createDefaultItem } from "./item-entity.js";
import {
  resolveLocalStorageConfig,
  type LocalStorageConfig,
  type LocalStorageConfigInput,
} from "./config.js";
import type { ItemKind, ItemSummary, WorkflowState } from "../core/index.js";
import type { SyncState } from "../core/sync.js";

export type YFelinLocalEngine = {
  readonly engine: Engine;
  readonly storage: LocalStorageConfig;
  readonly saveItem: (item: ItemSummary) => Promise<ItemSummary>;
  readonly getItem: (id: string) => Promise<ItemSummary | null>;
  readonly listItems: (options?: { readonly limit?: number }) => Promise<ItemSummary[]>;
  readonly syncState: () => Promise<SyncState>;
  readonly dispose: () => Promise<void>;
};

export function createLocalEngine(
  input: LocalStorageConfigInput = {},
): YFelinLocalEngine {
  const storage = resolveLocalStorageConfig(input);
  const engine = createEngine({
    entities: [ItemEntity],
    storage: createSqliteStorage({
      filePath: storage.sqliteFilePath,
    }),
  });

  return {
    engine,
    storage,
    saveItem(item) {
      return engine.save<ItemSummary>("item", item);
    },
    getItem(id) {
      return engine.get<ItemSummary>("item", id);
    },
    listItems(options) {
      return engine.list<ItemSummary>("item", options);
    },
    syncState() {
      return engine.sync.state();
    },
    dispose() {
      return engine.dispose();
    },
  };
}

export function createAndSaveDefaultItem(
  engine: YFelinLocalEngine,
  input: {
    readonly id: string;
    readonly kind?: ItemKind;
    readonly title: string;
    readonly createdAt?: string;
    readonly workflowState?: WorkflowState;
  },
): Promise<ItemSummary> {
  return engine.saveItem(createDefaultItem(input));
}
