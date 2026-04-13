import { describe, expect, it } from "vitest";
import {
  createAppServices,
  createAppStore,
  createActionRegistry,
  describeSyncState,
  advanceWorkflowState,
  getPerspective,
  getPerspectiveHelp,
  itemCapabilities,
  listPerspectives,
  rewindWorkflowState,
  togglePriorityLevel,
  validateItemTitle,
} from "../src/core/index.js";
import { createAndSaveDefaultItem, createLocalEngine } from "../src/index.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach } from "vitest";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("shared core", () => {
  it("lists the inbox perspective", () => {
    expect(listPerspectives()).toEqual([
      {
        id: "inbox",
        title: "Inbox",
        summary: "Primary perspective for capturing and reviewing items.",
      },
    ]);
  });

  it("returns a perspective by id", () => {
    expect(getPerspective("inbox")).toEqual({
      ok: true,
      value: {
        id: "inbox",
        title: "Inbox",
        summary: "Primary perspective for capturing and reviewing items.",
      },
    });
  });

  it("declares item capabilities by kind", () => {
    expect(itemCapabilities).toEqual({
      task: { priority: true, workflow: true },
      note: { priority: false, workflow: false },
    });
  });

  it("validates item titles in the domain layer", () => {
    expect(validateItemTitle("  Example  ")).toBe("Example");
    expect(() => validateItemTitle("   ")).toThrow("Item title cannot be empty.");
  });

  it("toggles priority levels in the domain layer", () => {
    expect(togglePriorityLevel("normal")).toBe("high");
    expect(togglePriorityLevel("high")).toBe("normal");
  });

  it("advances and rewinds workflow states in the domain layer", () => {
    expect(advanceWorkflowState("open")).toBe("active");
    expect(advanceWorkflowState("active")).toBe("done");
    expect(advanceWorkflowState("done")).toBe("done");

    expect(rewindWorkflowState("done")).toBe("active");
    expect(rewindWorkflowState("active")).toBe("open");
    expect(rewindWorkflowState("open")).toBe("open");
  });

  it("returns help for a perspective by id", () => {
    expect(getPerspectiveHelp("inbox")).toEqual({
      ok: true,
      value: {
        title: "Inbox Help",
        summary: "Actions and symbols for the chronological inbox perspective.",
        symbols: [
          { label: ">", description: "Marks the currently selected row." },
          { label: "*", description: "Marks a high-priority entry." },
          { label: "□", description: "Task entry." },
          { label: "-", description: "Note entry." },
        ],
      },
    });
  });

  it("returns a not found error for an unknown perspective", () => {
    expect(getPerspective("today")).toEqual({
      ok: false,
      error: {
        code: "not_found",
        message: "Unknown perspective: today",
      },
    });
  });

  it("creates an action registry that exposes registered ids", () => {
    const registry = createActionRegistry([
      {
        id: "perspectives.list",
        run: () => ["inbox"],
      },
    ]);

    expect(registry.list()).toEqual(["perspectives.list"]);
  });

  it("dispatches shared actions without any UI adapter", async () => {
    const store = createAppStore(createAppServices());

    await expect(store.dispatch("perspectives.list", undefined)).resolves.toEqual(
      {
        ok: true,
        value: ["inbox"],
      },
    );

    await expect(
      store.dispatch("perspectives.show", { perspectiveId: "inbox" }),
    ).resolves.toEqual({
      ok: true,
      value: {
        id: "inbox",
        title: "Inbox",
        summary: "Primary perspective for capturing and reviewing items.",
      },
    });
  });

  it("lists items through shared selectors in chronological order", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-core-test-"));
    tempRoots.push(root);

    const localEngine = createLocalEngine({ dataDir: root });
    await createAndSaveDefaultItem(localEngine, {
      id: "item-1",
      title: "Older",
      createdAt: "2026-04-08T09:00:00.000Z",
    });
    await createAndSaveDefaultItem(localEngine, {
      id: "item-2",
      title: "Newer",
      createdAt: "2026-04-09T09:00:00.000Z",
    });

    const services = createAppServices({ localEngine });
    const store = createAppStore(services);

    await expect(store.dispatch("items.list", undefined)).resolves.toEqual({
      ok: true,
      value: [
        {
          id: "item-1",
          kind: "task",
          title: "Older",
          createdAt: "2026-04-08T09:00:00.000Z",
          priority: "normal",
          workflowState: "open",
        },
        {
          id: "item-2",
          kind: "task",
          title: "Newer",
          createdAt: "2026-04-09T09:00:00.000Z",
          priority: "normal",
          workflowState: "open",
        },
      ],
    });

    await services.dispose();
  });

  it("merges tasks and notes into a single chronological inbox list", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-core-mixed-"));
    tempRoots.push(root);

    const localEngine = createLocalEngine({ dataDir: root });
    await createAndSaveDefaultItem(localEngine, {
      id: "note-1",
      kind: "note",
      title: "Earlier note",
      createdAt: "2026-04-08T09:00:00.000Z",
    });
    await createAndSaveDefaultItem(localEngine, {
      id: "task-1",
      title: "Later task",
      createdAt: "2026-04-09T09:00:00.000Z",
    });

    const services = createAppServices({ localEngine });

    await expect(services.items.list()).resolves.toEqual([
      {
        id: "note-1",
        kind: "note",
        title: "Earlier note",
        createdAt: "2026-04-08T09:00:00.000Z",
      },
      {
        id: "task-1",
        kind: "task",
        title: "Later task",
        createdAt: "2026-04-09T09:00:00.000Z",
        priority: "normal",
        workflowState: "open",
      },
    ]);

    await services.dispose();
  });

  it("applies inbox limits after merging tasks and notes", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-core-limit-"));
    tempRoots.push(root);

    const localEngine = createLocalEngine({ dataDir: root });
    await createAndSaveDefaultItem(localEngine, {
      id: "task-1",
      title: "Oldest task",
      createdAt: "2026-04-08T08:00:00.000Z",
    });
    await createAndSaveDefaultItem(localEngine, {
      id: "note-1",
      kind: "note",
      title: "Second oldest note",
      createdAt: "2026-04-08T09:00:00.000Z",
    });
    await createAndSaveDefaultItem(localEngine, {
      id: "task-2",
      title: "Newer task",
      createdAt: "2026-04-08T10:00:00.000Z",
    });
    await createAndSaveDefaultItem(localEngine, {
      id: "note-2",
      kind: "note",
      title: "Newest note",
      createdAt: "2026-04-08T11:00:00.000Z",
    });

    const services = createAppServices({ localEngine });

    await expect(services.items.list({ limit: 2 })).resolves.toEqual([
      {
        id: "task-1",
        kind: "task",
        title: "Oldest task",
        createdAt: "2026-04-08T08:00:00.000Z",
        priority: "normal",
        workflowState: "open",
      },
      {
        id: "note-1",
        kind: "note",
        title: "Second oldest note",
        createdAt: "2026-04-08T09:00:00.000Z",
      },
    ]);

    await services.dispose();
  });

  it("creates items through the shared action model", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-core-create-"));
    tempRoots.push(root);

    const localEngine = createLocalEngine({ dataDir: root });
    const services = createAppServices({
      localEngine,
      idGenerator: () => "item-created",
      now: () => "2026-04-09T10:00:00.000Z",
    });
    const store = createAppStore(services);

    await expect(
      store.dispatch("items.create", {
        kind: "task",
        title: "  Created from action  ",
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        id: "item-created",
        kind: "task",
        title: "Created from action",
        createdAt: "2026-04-09T10:00:00.000Z",
        priority: "normal",
        workflowState: "open",
      },
    });

    await expect(store.dispatch("items.list", undefined)).resolves.toEqual({
      ok: true,
      value: [
        {
          id: "item-created",
          kind: "task",
          title: "Created from action",
          createdAt: "2026-04-09T10:00:00.000Z",
          priority: "normal",
          workflowState: "open",
        },
      ],
    });

    await services.dispose();
  });

  it("updates items through the shared action model", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-core-update-"));
    tempRoots.push(root);

    const localEngine = createLocalEngine({ dataDir: root });
    const services = createAppServices({ localEngine });
    const store = createAppStore(services);

    await createAndSaveDefaultItem(localEngine, {
      id: "item-update",
      title: "Before edit",
      createdAt: "2026-04-09T10:00:00.000Z",
    });

    await expect(
      store.dispatch("items.update", {
        id: "item-update",
        title: "  After edit  ",
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        id: "item-update",
        kind: "task",
        title: "After edit",
        createdAt: "2026-04-09T10:00:00.000Z",
        priority: "normal",
        workflowState: "open",
      },
    });

    await expect(localEngine.getTask("item-update")).resolves.toEqual({
      id: "item-update",
      kind: "task",
      title: "After edit",
      createdAt: "2026-04-09T10:00:00.000Z",
      priority: "normal",
      workflowState: "open",
    });

    await services.dispose();
  });

  it("moves task workflow state through the shared action model", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-core-workflow-"));
    tempRoots.push(root);

    const localEngine = createLocalEngine({ dataDir: root });
    const services = createAppServices({ localEngine });
    const store = createAppStore(services);

    await createAndSaveDefaultItem(localEngine, {
      id: "item-workflow",
      title: "Workflow task",
      createdAt: "2026-04-09T10:00:00.000Z",
    });

    await expect(
      store.dispatch("items.workflow.next", { id: "item-workflow" }),
    ).resolves.toEqual({
      ok: true,
      value: {
        id: "item-workflow",
        kind: "task",
        title: "Workflow task",
        createdAt: "2026-04-09T10:00:00.000Z",
        priority: "normal",
        workflowState: "active",
      },
    });

    await expect(
      store.dispatch("items.workflow.previous", { id: "item-workflow" }),
    ).resolves.toEqual({
      ok: true,
      value: {
        id: "item-workflow",
        kind: "task",
        title: "Workflow task",
        createdAt: "2026-04-09T10:00:00.000Z",
        priority: "normal",
        workflowState: "open",
      },
    });

    await services.dispose();
  });

  it("leaves note workflow and priority unchanged through the shared action model", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-core-note-guards-"));
    tempRoots.push(root);

    const localEngine = createLocalEngine({ dataDir: root });
    const services = createAppServices({ localEngine });
    const store = createAppStore(services);

    await createAndSaveDefaultItem(localEngine, {
      id: "note-guard",
      kind: "note",
      title: "Immutable note actions",
      createdAt: "2026-04-09T10:00:00.000Z",
    });

    await expect(
      store.dispatch("items.workflow.next", { id: "note-guard" }),
    ).resolves.toEqual({
      ok: true,
      value: {
        id: "note-guard",
        kind: "note",
        title: "Immutable note actions",
        createdAt: "2026-04-09T10:00:00.000Z",
      },
    });

    await expect(
      store.dispatch("items.priority.toggle", { id: "note-guard" }),
    ).resolves.toEqual({
      ok: true,
      value: {
        id: "note-guard",
        kind: "note",
        title: "Immutable note actions",
        createdAt: "2026-04-09T10:00:00.000Z",
      },
    });

    await expect(localEngine.getNote("note-guard")).resolves.toEqual({
      id: "note-guard",
      kind: "note",
      title: "Immutable note actions",
      createdAt: "2026-04-09T10:00:00.000Z",
    });

    await services.dispose();
  });

  it("rejects empty item titles through the shared result shape", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-core-empty-"));
    tempRoots.push(root);

    const localEngine = createLocalEngine({ dataDir: root });
    const services = createAppServices({ localEngine });
    const store = createAppStore(services);

    await expect(
      store.dispatch("items.create", { kind: "task", title: "   " }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "invalid_input",
        message: "Item title cannot be empty.",
      },
    });

    await services.dispose();
  });

  it("rejects updates for unknown items", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-core-missing-"));
    tempRoots.push(root);

    const localEngine = createLocalEngine({ dataDir: root });
    const services = createAppServices({ localEngine });
    const store = createAppStore(services);

    await expect(
      store.dispatch("items.update", { id: "missing", title: "Edited" }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "invalid_input",
        message: "Unknown item: missing",
      },
    });

    await services.dispose();
  });

  it("returns dispatch errors through the shared result shape", async () => {
    const store = createAppStore(createAppServices());

    await expect(
      store.dispatch("perspectives.show", { perspectiveId: "today" }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "invalid_input",
        message: "Unknown perspective: today",
      },
    });
  });

  it("exposes local-only sync state through the shared action model", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-core-sync-"));
    tempRoots.push(root);

    const localEngine = createLocalEngine({ dataDir: root });
    const services = createAppServices({ localEngine });
    const store = createAppStore(services);

    await expect(store.dispatch("sync.state", undefined)).resolves.toEqual({
      ok: true,
      value: {
        status: "unconfigured",
        configured: false,
        pendingChanges: 0,
      },
    });

    expect(
      describeSyncState({
        status: "unconfigured",
        configured: false,
        pendingChanges: 0,
      }),
    ).toBe("sync local-only | pending 0");

    await services.dispose();
  });
});
