import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createAndSaveDefaultItem,
  createLocalEngine,
  resolveLocalStorageConfig,
} from "../src/index.js";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("resolveLocalStorageConfig", () => {
  it("uses XDG data home when available", () => {
    expect(
      resolveLocalStorageConfig({
        xdgDataHome: "/tmp/xdg-data",
        homeDir: "/tmp/home",
      }),
    ).toEqual({
      dataDir: "/tmp/xdg-data/y-felin",
      sqliteFilePath: "/tmp/xdg-data/y-felin/default.sqlite",
    });
  });

  it("falls back to ~/.local/share/y-felin", () => {
    expect(
      resolveLocalStorageConfig({
        homeDir: "/tmp/home",
      }),
    ).toEqual({
      dataDir: "/tmp/home/.local/share/y-felin",
      sqliteFilePath: "/tmp/home/.local/share/y-felin/default.sqlite",
    });
  });
});

describe("local lofipod persistence", () => {
  it("creates, lists, and reloads items from SQLite storage", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-local-test-"));
    tempRoots.push(root);

    const first = createLocalEngine({
      dataDir: root,
    });

    const saved = await createAndSaveDefaultItem(first, {
      id: "item-1",
      title: "First inbox item",
      createdAt: "2026-04-09T00:00:00.000Z",
    });

    expect(saved).toEqual({
      id: "item-1",
      kind: "task",
      title: "First inbox item",
      createdAt: "2026-04-09T00:00:00.000Z",
      priority: "normal",
      workflowState: "open",
    });

    await expect(first.getTask("item-1")).resolves.toEqual(saved);
    await expect(first.listTasks()).resolves.toEqual([saved]);
    await expect(first.listNotes()).resolves.toEqual([]);
    await first.dispose();

    const second = createLocalEngine({
      dataDir: root,
    });

    await expect(second.getTask("item-1")).resolves.toEqual(saved);
    await expect(second.listTasks()).resolves.toEqual([saved]);
    await expect(second.listNotes()).resolves.toEqual([]);
    await second.dispose();
  });

  it("persists tasks and notes in separate entity collections", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-local-mixed-"));
    tempRoots.push(root);

    const engine = createLocalEngine({
      dataDir: root,
    });

    await createAndSaveDefaultItem(engine, {
      id: "task-1",
      title: "Task entry",
      createdAt: "2026-04-09T00:00:00.000Z",
    });
    await createAndSaveDefaultItem(engine, {
      id: "note-1",
      kind: "note",
      title: "Note entry",
      createdAt: "2026-04-09T01:00:00.000Z",
    });

    await expect(engine.listTasks()).resolves.toEqual([
      {
        id: "task-1",
        kind: "task",
        title: "Task entry",
        createdAt: "2026-04-09T00:00:00.000Z",
        priority: "normal",
        workflowState: "open",
      },
    ]);
    await expect(engine.listNotes()).resolves.toEqual([
      {
        id: "note-1",
        kind: "note",
        title: "Note entry",
        createdAt: "2026-04-09T01:00:00.000Z",
        priority: "normal",
      },
    ]);

    await engine.dispose();
  });
});
