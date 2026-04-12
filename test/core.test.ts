import { describe, expect, it } from "vitest";
import {
  createAppServices,
  createAppStore,
  createActionRegistry,
  describeSyncState,
  getPerspective,
  getPerspectiveHelp,
  listPerspectives,
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

    await expect(
      store.dispatch("app.describe", { surface: "cli" }),
    ).resolves.toEqual({
      ok: true,
      value: {
        name: "melin",
        version: "0.0.0",
        surface: "cli",
        message: "Melin CLI placeholder",
      },
    });

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
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "melin-core-test-"));
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

  it("creates items through the shared action model", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "melin-core-create-"));
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
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "melin-core-update-"));
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

    await expect(localEngine.getItem("item-update")).resolves.toEqual({
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
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "melin-core-workflow-"));
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

  it("rejects empty item titles through the shared result shape", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "melin-core-empty-"));
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
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "melin-core-missing-"));
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
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "melin-core-sync-"));
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
