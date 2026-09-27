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
import { vocabulary } from "../local/vocabulary.js";
import { compareOrder, journalKinds, journalTitle, localJournalDate, ordered, positionOrder, validJournalDate, type JournalBlock, type JournalEntry, type JournalKind, type JournalParagraph, type Placement } from "./journal.js";

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
  readonly journal: {
    readonly today: () => string;
    readonly list: () => Promise<JournalEntry[]>;
    readonly paragraphs: () => Promise<JournalParagraph[]>;
    readonly get: (id: string) => Promise<JournalEntry | null>;
    readonly blocks: (parentId: string) => Promise<JournalBlock[]>;
    readonly create: (input: { kind: JournalKind; title: string; journalDate?: string; parentId?: string; placement: Placement; anchorId?: string }) => Promise<JournalEntry>;
    readonly paragraph: (input: { parentId: string; text: string; placement: Placement; anchorId?: string }) => Promise<JournalParagraph>;
    readonly updateTitle: (id: string, title: string) => Promise<JournalEntry>;
    readonly updateParagraph: (id: string, text: string) => Promise<JournalParagraph>;
    readonly workflow: (id: string, direction: "next" | "previous") => Promise<JournalEntry>;
    readonly togglePriority: (id: string) => Promise<JournalEntry>;
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
  const today = () => localJournalDate(new Date(now()));
  const writeQueues = new Map<string, Promise<unknown>>();
  const serialized = <T>(key: string, work: () => Promise<T>): Promise<T> => {
    const previous = writeQueues.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(work);
    writeQueues.set(key, next);
    void next.finally(() => { if (writeQueues.get(key) === next) writeQueues.delete(key); }).catch(() => undefined);
    return next;
  };

  const getJournalEntry = async (id: string): Promise<JournalEntry | null> => {
    const local = requireLocalEngine();
    const entry = await local.getJournalEntry(id);
    if (entry) return entry;
    const legacy = await getAnyItem(local, id);
    return legacy ? legacyAsJournalEntry(legacy) : null;
  };

  const listJournalEntries = async (): Promise<JournalEntry[]> => {
    const local = requireLocalEngine();
    const [entries, tasks, notes] = await Promise.all([local.listJournalEntries(), local.listTasks(), local.listNotes()]);
    return [...entries, ...tasks.map(legacyAsJournalEntry), ...notes.map(legacyAsJournalEntry)]
      .sort((left, right) => left.journalDate.localeCompare(right.journalDate) || compareOrder(left.order, right.order) || left.id.localeCompare(right.id));
  };

  const listBlocks = async (parentId: string): Promise<JournalBlock[]> => {
    const local = requireLocalEngine();
    const [entries, paragraphs] = await Promise.all([local.listJournalEntries(), local.listJournalParagraphs()]);
    const blocks: JournalBlock[] = [
      ...entries.filter((entry) => entry.parentId === parentId).map((value): JournalBlock => ({ type: "entry", value })),
      ...paragraphs.filter((paragraph) => paragraph.parentId === parentId).map((value): JournalBlock => ({ type: "paragraph", value })),
    ];
    return ordered(blocks.map((block) => ({ ...block, id: block.value.id, order: block.value.order }))).map(({ id: _id, order: _order, ...block }) => block);
  };

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

        const local = requireLocalEngine();
        const existing = await getAnyItem(local, id);
        if (!existing) {
          return err(appError("not_found", `Unknown item: ${id}`));
        }

        return ok(
          await saveAnyItem(local, {
            ...existing,
            title: validatedTitle,
          }),
        );
      },
      async advanceWorkflow({ id }) {
        const local = requireLocalEngine();
        const existing = await getAnyItem(local, id);
        if (!existing) {
          throw new Error(`Unknown item: ${id}`);
        }

        if (existing.kind !== "task") {
          return existing;
        }

        return local.saveTask({
          ...existing,
          workflowState: advanceWorkflowState(existing.workflowState),
        });
      },
      async rewindWorkflow({ id }) {
        const local = requireLocalEngine();
        const existing = await getAnyItem(local, id);
        if (!existing) {
          throw new Error(`Unknown item: ${id}`);
        }

        if (existing.kind !== "task") {
          return existing;
        }

        return local.saveTask({
          ...existing,
          workflowState: rewindWorkflowState(existing.workflowState),
        });
      },
      async togglePriority({ id }) {
        const local = requireLocalEngine();
        const existing = await getAnyItem(local, id);
        if (!existing) {
          throw new Error(`Unknown item: ${id}`);
        }

        if (existing.kind !== "task") {
          return existing;
        }

        return saveAnyItem(local, {
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
    journal: {
      today,
      list: listJournalEntries,
      paragraphs: () => requireLocalEngine().listJournalParagraphs(),
      get: getJournalEntry,
      blocks: listBlocks,
      async create(input) {
        if (!journalKinds.includes(input.kind)) throw new Error(`Unknown journal type: ${input.kind}`);
        const title = journalTitle(input.title);
        const journalDate = input.journalDate ?? today();
        if (!validJournalDate(journalDate)) throw new Error(`Invalid journal date: ${journalDate}`);
        let parentUri: string | undefined;
        if (input.parentId) {
          const parent = await getJournalEntry(input.parentId);
          if (!parent) throw new Error("Parent entry no longer exists.");
          if (parent.parentId) throw new Error("Journal entries support only one child level.");
          if (parent.source === "legacy") parentUri = vocabulary.uri({ entityName: parent.kind, id: parent.id }).value;
        }
        const siblings = input.parentId
          ? (await listBlocks(input.parentId)).map((block) => block.value)
          : (await listJournalEntries()).filter((entry) => !entry.parentId && entry.journalDate === journalDate);
        const order = positionOrder(siblings, input.placement, input.anchorId);
        const entry: JournalEntry = {
          id: idGenerator(), kind: input.kind, title, createdAt: now(), journalDate,
          order, ...(input.parentId ? { parentId: input.parentId } : {}), ...(parentUri ? { parentUri } : {}),
          ...(input.kind === "task" ? { priority: "normal" as const, workflowState: "open" as const } : {}),
        };
        return requireLocalEngine().saveJournalEntry(entry);
      },
      async paragraph(input) {
        const parent = await getJournalEntry(input.parentId);
        if (!parent) throw new Error("Parent entry no longer exists.");
        if (!input.text.trim()) throw new Error("Paragraph cannot be empty.");
        const blocks = await listBlocks(input.parentId);
        const paragraph: JournalParagraph = {
          id: idGenerator(), parentId: input.parentId, text: input.text,
          createdAt: now(), order: positionOrder(blocks.map((block) => block.value), input.placement, input.anchorId),
          ...(parent.source === "legacy" ? { parentUri: vocabulary.uri({ entityName: parent.kind, id: parent.id }).value } : {}),
        };
        return requireLocalEngine().saveJournalParagraph(paragraph);
      },
      async updateTitle(id, title) {
        return serialized(`entry:${id}`, async () => {
          const current = await getJournalEntry(id);
          if (!current) throw new Error("Entry no longer exists.");
          const validated = journalTitle(title);
          if (current.source === "legacy") {
            const result = await getAnyItem(requireLocalEngine(), id);
            if (!result) throw new Error("Entry no longer exists.");
            return legacyAsJournalEntry(await saveAnyItem(requireLocalEngine(), { ...result, title: validated }));
          }
          return requireLocalEngine().saveJournalEntry({ ...current, title: validated });
        });
      },
      async updateParagraph(id, text) {
        return serialized(`paragraph:${id}`, async () => {
          const current = await requireLocalEngine().getJournalParagraph(id);
          if (!current) throw new Error("Paragraph no longer exists.");
          return requireLocalEngine().saveJournalParagraph({ ...current, text });
        });
      },
      async workflow(id, direction) {
        return serialized(`entry:${id}`, async () => {
          const current = await getJournalEntry(id);
          if (!current || current.kind !== "task") throw new Error("Selected entry is not a task.");
          if (current.source === "legacy") {
            const task = await requireLocalEngine().getTask(id);
            if (!task) throw new Error("Task no longer exists.");
            return legacyAsJournalEntry(await requireLocalEngine().saveTask({ ...task, workflowState: direction === "next" ? advanceWorkflowState(task.workflowState) : rewindWorkflowState(task.workflowState) }));
          }
          return requireLocalEngine().saveJournalEntry({ ...current, workflowState: direction === "next" ? advanceWorkflowState(current.workflowState ?? "open") : rewindWorkflowState(current.workflowState ?? "open") });
        });
      },
      async togglePriority(id) {
        return serialized(`entry:${id}`, async () => {
          const current = await getJournalEntry(id);
          if (!current || current.kind !== "task") throw new Error("Selected entry is not a task.");
          if (current.source === "legacy") {
            const task = await requireLocalEngine().getTask(id);
            if (!task) throw new Error("Task no longer exists.");
            return legacyAsJournalEntry(await requireLocalEngine().saveTask({ ...task, priority: togglePriorityLevel(task.priority) }));
          }
          return requireLocalEngine().saveJournalEntry({ ...current, priority: togglePriorityLevel(current.priority ?? "normal") });
        });
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

function legacyAsJournalEntry(item: AnyItem): JournalEntry {
  const date = new Date(item.createdAt);
  return {
    id: item.id, kind: item.kind, title: item.title, createdAt: item.createdAt,
    journalDate: Number.isNaN(date.getTime()) ? "1970-01-01" : localJournalDate(date),
    order: Number.isNaN(date.getTime()) ? "0" : String(date.getTime()), source: "legacy",
    ...(item.kind === "task" ? { priority: item.priority, workflowState: item.workflowState } : {}),
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
