import React from "react";
import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveShellLayout } from "../src/tui/layout.js";
import { TuiShell } from "../src/tui/shell.js";
import {
  createAndSaveDefaultItem,
  createAppServices,
  createLocalEngine,
} from "../src/index.js";

function expectFrameToContainAll(frame: string, anchors: string[]) {
  for (const anchor of anchors) {
    expect(frame).toContain(anchor);
  }
}

describe("resolveShellLayout", () => {
  it("allocates bars and main area when both bars are visible", () => {
    expect(
      resolveShellLayout({
        columns: 120,
        rows: 40,
        showTopBar: true,
        showBottomBar: true,
      }),
    ).toEqual({
      columns: 120,
      rows: 40,
      topBarHeight: 1,
      bottomBarHeight: 1,
      mainHeight: 38,
    });
  });

  it("preserves a usable main area when bars are hidden", () => {
    expect(
      resolveShellLayout({
        columns: 90,
        rows: 10,
        showTopBar: false,
        showBottomBar: false,
      }),
    ).toEqual({
      columns: 90,
      rows: 10,
      topBarHeight: 0,
      bottomBarHeight: 0,
      mainHeight: 10,
    });
  });
});

describe("TuiShell", () => {
  it("renders the shell with both bars visible", () => {
    const app = render(<TuiShell dimensions={{ columns: 100, rows: 30 }} />);

    expectFrameToContainAll(app.lastFrame(), [
      "MELIN",
      "inbox",
      "[Inbox]",
      "rows 28",
      "Loading inbox...",
      "Focus: none",
      "Editor: idle",
      "sync local-only",
    ]);

    app.unmount();
  });

  it("hides the bars when requested", () => {
    const app = render(
      <TuiShell
        showTopBar={false}
        showBottomBar={false}
        dimensions={{ columns: 72, rows: 18 }}
      />,
    );

    expect(app.lastFrame()).not.toContain("Toolbox");
    expect(app.lastFrame()).not.toContain("Status");
    expectFrameToContainAll(app.lastFrame(), ["[Inbox]", "rows 18"]);

    app.unmount();
  });

  it("adapts to terminal resize", () => {
    const app = render(<TuiShell dimensions={{ columns: 80, rows: 24 }} />);
    expectFrameToContainAll(app.lastFrame(), [
      "MELIN",
      "[Inbox]",
      "rows 22",
      "size 80x24",
      "Focus: none",
      "sync local-only",
    ]);

    app.rerender(<TuiShell dimensions={{ columns: 96, rows: 28 }} />);

    expectFrameToContainAll(app.lastFrame(), [
      "MELIN",
      "cols 96",
      "[Inbox]",
      "rows 26",
      "size 96x28",
      "Focus: none",
      "sync local-only",
    ]);

    app.unmount();
  });

  it("quits the application with q", async () => {
    const app = render(<TuiShell dimensions={{ columns: 80, rows: 24 }} />);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(app.lastFrame()).toContain("MELIN");

    app.stdin.write("q");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(app.lastFrame().trim()).toBe("");
  });

  it("opens contextual help with ?, full help with H, and closes with Esc", async () => {
    const app = render(<TuiShell dimensions={{ columns: 90, rows: 20 }} />);

    await new Promise((resolve) => setTimeout(resolve, 50));
    app.stdin.write("?");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expectFrameToContainAll(app.lastFrame(), [
      "[Inbox Help]",
      "Actions",
      "Symbols",
      "Create a new task at the bottom of the inbox.",
      "Task entry.",
      "Editor: help",
      "H full help | E",
    ]);

    app.stdin.write("H");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expectFrameToContainAll(app.lastFrame(), [
      "[Help]",
      "Help Levels",
      "Open contextual help for the current perspective.",
      "Open the main help document.",
      "? contextual he",
    ]);

    app.stdin.write("?");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expectFrameToContainAll(app.lastFrame(), [
      "[Inbox Help]",
      "Actions",
      "Symbols",
      "H full help | E",
    ]);

    app.stdin.write("\u001B");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(app.lastFrame()).not.toContain("[Inbox Help]");
    expect(app.lastFrame()).not.toContain("[Help]");
    expectFrameToContainAll(app.lastFrame(), [
      "[Inbox]",
      "Editor: idle",
      "sync local-only",
    ]);

    app.unmount();
  });

  it("renders persisted inbox items and supports keyboard navigation", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "melin-tui-test-"));
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
    const app = render(
      <TuiShell
        dimensions={{ columns: 90, rows: 20 }}
        services={services}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    expectFrameToContainAll(app.lastFrame(), [
      "items 2",
      "Newer",
      "Older",
      "Focus: 1/2",
      "Editor: idle",
    ]);
    expect(app.lastFrame()).toContain("> □ Older");

    app.stdin.write("j");
    await new Promise((resolve) => setTimeout(resolve, 10));

    expectFrameToContainAll(app.lastFrame(), [
      "Newer",
      "Older",
      "Focus: 2/2",
      "Editor: idle",
    ]);
    expect(app.lastFrame()).toContain("> □ Newer");

    app.unmount();
    await services.dispose();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("supports inline capture submit and immediate list refresh", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "melin-tui-capture-"));
    const localEngine = createLocalEngine({ dataDir: root });
    const services = createAppServices({
      localEngine,
      idGenerator: () => "item-captured",
      now: () => "2026-04-09T12:00:00.000Z",
    });
    const app = render(
      <TuiShell dimensions={{ columns: 90, rows: 20 }} services={services} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    app.stdin.write("t");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expectFrameToContainAll(app.lastFrame(), [
      "new task>",
      "Editor: new task",
    ]);

    app.stdin.write("New item");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(app.lastFrame()).toContain("new task> New item_");

    app.stdin.write("\r");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expectFrameToContainAll(app.lastFrame(), [
      "items 1",
      "New item",
      "Focus: 1/1",
      "Editor: idle",
    ]);
    expect(app.lastFrame()).toContain("> □ New item");

    await expect(localEngine.listItems()).resolves.toEqual([
      {
        id: "item-captured",
        kind: "task",
        title: "New item",
        createdAt: "2026-04-09T12:00:00.000Z",
      },
    ]);

    app.unmount();
    await services.dispose();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("shows the inline create row at the bottom of the inbox", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "melin-tui-create-bottom-"));
    const localEngine = createLocalEngine({ dataDir: root });
    await createAndSaveDefaultItem(localEngine, {
      id: "item-1",
      title: "First",
      createdAt: "2026-04-09T09:00:00.000Z",
    });
    await createAndSaveDefaultItem(localEngine, {
      id: "item-2",
      title: "Second",
      createdAt: "2026-04-09T10:00:00.000Z",
    });
    await createAndSaveDefaultItem(localEngine, {
      id: "item-3",
      title: "Third",
      createdAt: "2026-04-09T11:00:00.000Z",
    });

    const services = createAppServices({ localEngine });
    const app = render(
      <TuiShell dimensions={{ columns: 90, rows: 20 }} services={services} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));
    app.stdin.write("t");
    await new Promise((resolve) => setTimeout(resolve, 20));

    const frame = app.lastFrame();
    const thirdIndex = frame.indexOf("Third");
    const composerIndex = frame.indexOf("new task> _");

    expectFrameToContainAll(frame, ["First", "Second", "Third", "new task> _"]);
    expect(thirdIndex).toBeGreaterThanOrEqual(0);
    expect(composerIndex).toBeGreaterThan(thirdIndex);

    app.unmount();
    await services.dispose();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("supports inline capture cancel", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "melin-tui-cancel-"));
    const localEngine = createLocalEngine({ dataDir: root });
    const services = createAppServices({ localEngine });
    const app = render(
      <TuiShell dimensions={{ columns: 90, rows: 20 }} services={services} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    app.stdin.write("t");
    await new Promise((resolve) => setTimeout(resolve, 10));
    app.stdin.write("Discard me");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(app.lastFrame()).toContain("new task> Discard me_");

    app.stdin.write("\u001B");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(app.lastFrame()).not.toContain("new task> Discard me_");
    expectFrameToContainAll(app.lastFrame(), [
      "Inbox is empty.",
      "Editor: idle",
      "Press t for a task or n for a note.",
    ]);
    await expect(localEngine.listItems()).resolves.toEqual([]);

    app.unmount();
    await services.dispose();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("creates notes with the n shortcut", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "melin-tui-note-"));
    const localEngine = createLocalEngine({ dataDir: root });
    const services = createAppServices({
      localEngine,
      idGenerator: () => "item-note",
      now: () => "2026-04-09T13:00:00.000Z",
    });
    const app = render(
      <TuiShell dimensions={{ columns: 90, rows: 20 }} services={services} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    app.stdin.write("n");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expectFrameToContainAll(app.lastFrame(), [
      "new note>",
      "Editor: new note",
    ]);

    app.stdin.write("Remember this");
    await new Promise((resolve) => setTimeout(resolve, 10));
    app.stdin.write("\r");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expectFrameToContainAll(app.lastFrame(), [
      "Remember this",
      "Editor: idle",
    ]);
    expect(app.lastFrame()).toContain("> - Remember this");

    await expect(localEngine.getItem("item-note")).resolves.toEqual({
      id: "item-note",
      kind: "note",
      title: "Remember this",
      createdAt: "2026-04-09T13:00:00.000Z",
    });

    app.unmount();
    await services.dispose();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("supports item-scoped edit and preserves focus", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "melin-tui-edit-"));
    const localEngine = createLocalEngine({ dataDir: root });
    await createAndSaveDefaultItem(localEngine, {
      id: "item-1",
      title: "First",
      createdAt: "2026-04-09T09:00:00.000Z",
    });
    await createAndSaveDefaultItem(localEngine, {
      id: "item-2",
      title: "Second",
      createdAt: "2026-04-09T10:00:00.000Z",
    });

    const services = createAppServices({ localEngine });
    const app = render(
      <TuiShell dimensions={{ columns: 90, rows: 20 }} services={services} />,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));
    expectFrameToContainAll(app.lastFrame(), ["Focus: 1/2", "> □ First"]);

    app.stdin.write("e");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expectFrameToContainAll(app.lastFrame(), [
      "edit task> First_",
      "Editor: edit task",
      "editing",
    ]);

    for (let index = 0; index < "First".length; index += 1) {
      app.stdin.write("\u007F");
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    app.stdin.write("Renamed");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(app.lastFrame()).toContain("edit task> Renamed_");

    app.stdin.write("\r");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expectFrameToContainAll(app.lastFrame(), [
      "Renamed",
      "Focus: 1/2",
      "Editor: idle",
    ]);
    expect(app.lastFrame()).toContain("> □ Renamed");

    await expect(localEngine.getItem("item-1")).resolves.toEqual({
      id: "item-1",
      kind: "task",
      title: "Renamed",
      createdAt: "2026-04-09T09:00:00.000Z",
    });

    app.unmount();
    await services.dispose();
    fs.rmSync(root, { recursive: true, force: true });
  });
});
