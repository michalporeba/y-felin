import { createEngine, type Engine } from "lofipod";
import { createSqliteStorage } from "lofipod/node";
import { createDefaultNote, NoteEntity } from "./note-entity.js";
import { createDefaultTask, TaskEntity } from "./task-entity.js";
import {
  resolveLocalStorageConfig,
  type LocalStorageConfig,
  type LocalStorageConfigInput,
} from "./config.js";
import type { AnyItem, Note, Task, WorkflowState } from "../core/index.js";
import type { SyncState } from "../core/sync.js";

export type YFelinLocalEngine = {
  readonly engine: Engine;
  readonly storage: LocalStorageConfig;
  readonly saveTask: (task: Task) => Promise<Task>;
  readonly getTask: (id: string) => Promise<Task | null>;
  readonly listTasks: (options?: { readonly limit?: number }) => Promise<Task[]>;
  readonly saveNote: (note: Note) => Promise<Note>;
  readonly getNote: (id: string) => Promise<Note | null>;
  readonly listNotes: (options?: { readonly limit?: number }) => Promise<Note[]>;
  readonly syncState: () => Promise<SyncState>;
  readonly dispose: () => Promise<void>;
};

export function createLocalEngine(
  input: LocalStorageConfigInput = {},
): YFelinLocalEngine {
  const storage = resolveLocalStorageConfig(input);
  const engine = createEngine({
    entities: [TaskEntity, NoteEntity],
    storage: createSqliteStorage({
      filePath: storage.sqliteFilePath,
    }),
  });

  return {
    engine,
    storage,
    saveTask(task) {
      return engine.save<Task>("task", task);
    },
    getTask(id) {
      return engine.get<Task>("task", id);
    },
    listTasks(options) {
      return engine.list<Task>("task", options);
    },
    saveNote(note) {
      return engine.save<Note>("note", note);
    },
    getNote(id) {
      return engine.get<Note>("note", id);
    },
    listNotes(options) {
      return engine.list<Note>("note", options);
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
    readonly kind?: AnyItem["kind"];
    readonly title: string;
    readonly createdAt?: string;
    readonly workflowState?: WorkflowState;
  },
): Promise<AnyItem> {
  if (input.kind === "note") {
    return engine.saveNote(
      createDefaultNote({
        id: input.id,
        title: input.title,
        createdAt: input.createdAt,
      }),
    );
  }

  return engine.saveTask(
    createDefaultTask({
      id: input.id,
      title: input.title,
      createdAt: input.createdAt,
      workflowState: input.workflowState,
    }),
  );
}
