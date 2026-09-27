import React from "react";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import { createAppServices, createLocalEngine } from "../src/index.js";
import { TuiShell } from "../src/tui/shell.js";

const roots: string[] = [];
function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-journal-ui-"));
  roots.push(root);
  const services = createAppServices({ localEngine: createLocalEngine({ dataDir: root }), now: () => "2026-09-27T10:00:00.000Z" });
  return { root, services };
}
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
const pause = (ms = 12) => new Promise((resolve) => setTimeout(resolve, ms));
async function keys(app: ReturnType<typeof render>, sequence: string) {
  for (const character of sequence) { app.stdin.write(character); await pause(); }
}

describe("JournalShell", () => {
  it("opens on today, captures a note, and preserves focus after append from a past day", async () => {
    const { services } = setup();
    const app = render(<TuiShell services={services} dimensions={{ columns: 80, rows: 24 }} />);
    await pause(40);
    expect(app.lastFrame()).toContain("Journal · 2026-09-27");
    await keys(app, "an");
    await keys(app, "Today");
    await pause(520);
    expect(app.lastFrame()).toContain("Today");
    app.stdin.write("\u001b"); await pause(30);
    await keys(app, "gd");
    for (let i = 0; i < 10; i++) { app.stdin.write("\u007f"); await pause(); }
    await keys(app, "2026-09-26"); app.stdin.write("\r"); await pause(30);
    expect(app.lastFrame()).toContain("2026-09-26");
    await keys(app, "an"); await keys(app, "From yesterday"); await pause(520);
    expect(app.lastFrame()).toContain("From yesterday");
    expect(app.lastFrame()).toContain("> 2026-09-26");
    app.unmount(); await services.dispose();
  });

  it("opens details only on command, previews without changing focus, and shows formatted paragraphs", async () => {
    const { services } = setup();
    const parent = await services.journal.create({ kind: "note", title: "My **note**", placement: "last" });
    await services.journal.paragraph({ parentId: parent.id, text: "Some *detail*", placement: "last" });
    const app = render(<TuiShell services={services} dimensions={{ columns: 80, rows: 14 }} />);
    await pause(30);
    expect(app.lastFrame()).not.toContain("Details · note");
    await keys(app, "j"); await keys(app, "o");
    expect(app.lastFrame()).toContain("Details · note");
    expect(app.lastFrame()).toContain("Some detail");
    expect(app.lastFrame()).toContain("Journal · 2026-09-27 ◀");
    await keys(app, "e");
    expect(app.lastFrame()).toContain("Details · note ◀");
    app.unmount(); await services.dispose();
  });

  it("keeps large feeds within the viewport and makes the selected entry visible", async () => {
    const { services } = setup();
    for (let i = 0; i < 200; i++) await services.journal.create({ kind: "task", title: `Item ${i}`, placement: "last" });
    const app = render(<TuiShell services={services} dimensions={{ columns: 80, rows: 24 }} />);
    await pause(40);
    await keys(app, "G");
    const frame = app.lastFrame();
    expect(frame).toContain("Item 199");
    expect(frame.split("\n")).toHaveLength(24);
    app.unmount(); await services.dispose();
  });

  it("retains an editable draft after an autosave failure and retries on exit from text mode", async () => {
    const { services } = setup();
    const entry = await services.journal.create({ kind: "note", title: "Original", placement: "last" });
    let fail = true;
    const injected = { ...services, journal: { ...services.journal, updateTitle: async (id: string, title: string) => {
      if (fail) throw new Error("storage unavailable");
      return services.journal.updateTitle(id, title);
    } } };
    const app = render(<TuiShell services={injected} dimensions={{ columns: 80, rows: 14 }} />);
    await pause(30);
    await keys(app, "j"); app.stdin.write("\r"); await pause();
    await keys(app, "X"); await pause(520);
    expect(app.lastFrame()).toContain("UNSAVED: storage unavailable");
    expect((await services.journal.get(entry.id))?.title).toBe("Original");
    fail = false;
    app.stdin.write("\u001b"); await pause(50);
    expect((await services.journal.get(entry.id))?.title).toBe("OriginalX");
    app.unmount(); await services.dispose();
  });

  it("keeps chronological date navigation when day display order is reversed", async () => {
    const { services } = setup();
    await services.journal.create({ kind: "event", title: "Earlier", journalDate: "2026-09-25", placement: "last" });
    await services.journal.create({ kind: "note", title: "Today", placement: "last" });
    const app = render(<TuiShell services={services} journalDayOrder="newest-first" dimensions={{ columns: 76, rows: 12 }} />);
    await pause(30);
    await keys(app, "gt");
    await keys(app, "[d");
    expect(app.lastFrame()).toContain("Journal · 2026-09-25");
    app.unmount(); await services.dispose();
  });

  it("keeps panes within a narrow or very short terminal", async () => {
    const { services } = setup();
    const entry = await services.journal.create({ kind: "idea", title: "Narrow", placement: "last" });
    await services.journal.paragraph({ parentId: entry.id, text: "A long paragraph with enough content to flow onto a second line in the narrow details pane.", placement: "last" });
    const app = render(<TuiShell services={services} dimensions={{ columns: 40, rows: 8 }} />);
    await pause(30); await keys(app, "je");
    expect(app.lastFrame().split("\n")).toHaveLength(8);
    expect(app.lastFrame()).toContain("Details · idea");
    app.rerender(<TuiShell services={services} dimensions={{ columns: 40, rows: 1 }} />);
    expect(app.lastFrame().split("\n")).toHaveLength(1);
    app.unmount(); await services.dispose();
  });
});
