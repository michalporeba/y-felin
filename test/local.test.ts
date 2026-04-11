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
      dataDir: "/tmp/xdg-data/melin",
      sqliteFilePath: "/tmp/xdg-data/melin/melin.sqlite",
    });
  });

  it("falls back to ~/.local/share/melin", () => {
    expect(
      resolveLocalStorageConfig({
        homeDir: "/tmp/home",
      }),
    ).toEqual({
      dataDir: "/tmp/home/.local/share/melin",
      sqliteFilePath: "/tmp/home/.local/share/melin/melin.sqlite",
    });
  });
});

describe("local lofipod persistence", () => {
  it("creates, lists, and reloads items from SQLite storage", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "melin-local-test-"));
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
      workflowState: "open",
    });

    await expect(first.getItem("item-1")).resolves.toEqual(saved);
    await expect(first.listItems()).resolves.toEqual([saved]);
    await first.dispose();

    const second = createLocalEngine({
      dataDir: root,
    });

    await expect(second.getItem("item-1")).resolves.toEqual(saved);
    await expect(second.listItems()).resolves.toEqual([saved]);
    await second.dispose();
  });
});
