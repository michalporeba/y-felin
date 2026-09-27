import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createAppServices, createLocalEngine, createAndSaveDefaultItem, localJournalDate, type JournalEntry, type JournalKind } from "../src/index.js";
import { namedNode } from "lofipod";

const roots: string[] = [];
function setup(now = "2026-09-27T10:00:00.000Z") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-journal-core-"));
  roots.push(root);
  const localEngine = createLocalEngine({ dataDir: root });
  return { root, localEngine, services: createAppServices({ localEngine, now: () => now }) };
}
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

describe("journal persistence", () => {
  it("captures all basic types across days with explicit ordering and stable identities", async () => {
    const { root, services, localEngine } = setup();
    const kinds: JournalKind[] = ["note", "idea", "task", "event", "checklist", "appointment"];
    for (const kind of kinds) await services.journal.create({ kind, title: kind, placement: "last" });
    const initial = (await services.journal.list()).filter((entry) => !entry.parentId);
    expect(initial.map((entry) => entry.kind)).toEqual(kinds);
    const middle = await services.journal.create({ kind: "note", title: "inserted", journalDate: "2026-09-27", placement: "before", anchorId: initial[1]!.id });
    await services.journal.create({ kind: "event", title: "yesterday", journalDate: "2026-09-26", placement: "last" });
    expect((await services.journal.list()).filter((entry) => entry.journalDate === "2026-09-27").map((entry) => entry.title)).toEqual(["note", "inserted", "idea", "task", "event", "checklist", "appointment"]);
    expect(middle.id).toBe((await services.journal.get(middle.id))?.id);
    await services.dispose();
    const reopened = createAppServices({ localEngine: createLocalEngine({ dataDir: root }) });
    expect((await reopened.journal.get(middle.id))?.title).toBe("inserted");
    expect((await reopened.journal.list()).map((entry) => entry.journalDate)).toContain("2026-09-26");
    await reopened.dispose();
    void localEngine;
  });

  it("keeps paragraphs and one-level children independent from the journal feed", async () => {
    const { services } = setup();
    const parent = await services.journal.create({ kind: "idea", title: "Parent", placement: "last" });
    const paragraph = await services.journal.paragraph({ parentId: parent.id, text: "First **bold** paragraph", placement: "last" });
    const child = await services.journal.create({ kind: "task", title: "Child", parentId: parent.id, placement: "last" });
    expect((await services.journal.blocks(parent.id)).map((block) => block.value.id)).toEqual([paragraph.id, child.id]);
    await services.journal.updateParagraph(paragraph.id, "Edited *italic* paragraph");
    expect((await services.journal.blocks(parent.id))[0]!.value).toMatchObject({ text: "Edited *italic* paragraph" });
    expect((await services.journal.get(parent.id))?.title).toBe("Parent");
    await expect(services.journal.create({ kind: "task", title: "Grandchild", parentId: child.id, placement: "last" })).rejects.toThrow("one child level");
    expect((await services.journal.list()).filter((entry) => !entry.parentId)).toHaveLength(1);
    await services.dispose();
  });

  it("shows legacy items on their original local date and retains unknown RDF on edit", async () => {
    const { services, localEngine } = setup();
    const old = await createAndSaveDefaultItem(localEngine, { id: "old-task", title: "Older", createdAt: "2024-02-03T12:00:00.000Z" });
    if (old.kind !== "task") throw new Error("Expected a task fixture.");
    const custom = namedNode("https://example.test/custom");
    await localEngine.saveTask({ ...old, extraTriples: [[namedNode("https://y-felin.app/id/task/old-task"), custom, "retain"]] });
    const projected = (await services.journal.list()).find((entry) => entry.id === old.id);
    expect(projected).toMatchObject({ source: "legacy", journalDate: "2024-02-03" });
    await services.journal.updateTitle(old.id, "Renamed");
    expect((await localEngine.getTask(old.id))?.extraTriples).toHaveLength(1);
    expect((await localEngine.getTask(old.id))?.title).toBe("Renamed");
    const paragraph = await services.journal.paragraph({ parentId: old.id, text: "Legacy details", placement: "last" });
    const child = await services.journal.create({ kind: "task", title: "Follow up", parentId: old.id, placement: "last" });
    expect((await localEngine.getJournalParagraph(paragraph.id))?.parentUri).toBe("https://y-felin.app/id/task/old-task");
    expect((await localEngine.getJournalEntry(child.id))?.parentUri).toBe("https://y-felin.app/id/task/old-task");
    expect((await services.journal.blocks(old.id)).map((block) => block.value.id)).toEqual([paragraph.id, child.id]);
    await services.dispose();
  });

  it("preserves extra triples on a new entry edit", async () => {
    const { services, localEngine } = setup();
    const entry = await services.journal.create({ kind: "note", title: "Original", placement: "last" });
    const subject = namedNode(`https://y-felin.app/id/journal-entry/${entry.id}`);
    const triple: NonNullable<JournalEntry["extraTriples"]>[number] = [subject, namedNode("https://example.test/custom"), "preserve"];
    const extraType: NonNullable<JournalEntry["extraTriples"]>[number] = [subject, namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), namedNode("https://example.test/ExternalType")];
    await localEngine.saveJournalEntry({ ...entry, extraTriples: [triple, extraType] });
    await services.journal.updateTitle(entry.id, "Updated");
    expect((await localEngine.getJournalEntry(entry.id))?.extraTriples).toHaveLength(2);
    await services.dispose();
  });

  it("places entries before, after, first, and last without changing other identities", async () => {
    const { services } = setup();
    const a = await services.journal.create({ kind: "note", title: "A", placement: "last" });
    const b = await services.journal.create({ kind: "note", title: "B", placement: "last" });
    await services.journal.create({ kind: "idea", title: "First", placement: "first" });
    await services.journal.create({ kind: "task", title: "After A", placement: "after", anchorId: a.id });
    await services.journal.create({ kind: "event", title: "Before B", placement: "before", anchorId: b.id });
    expect((await services.journal.list()).map((entry) => entry.title)).toEqual(["First", "A", "After A", "Before B", "B"]);
    expect((await services.journal.get(a.id))?.id).toBe(a.id);
    await services.dispose();
  });

  it("serializes updates to the same record and computes local calendar dates", async () => {
    const { services } = setup();
    const entry = await services.journal.create({ kind: "note", title: "Start", placement: "last" });
    await Promise.all([services.journal.updateTitle(entry.id, "First"), services.journal.updateTitle(entry.id, "Second")]);
    expect((await services.journal.get(entry.id))?.title).toBe("Second");
    expect(localJournalDate(new Date(2026, 8, 27, 0, 1))).toBe("2026-09-27");
    await expect(services.journal.create({ kind: "note", title: "two\nlines", placement: "last" })).rejects.toThrow("one line");
    await services.dispose();
  });

  it("continues inserting between the same neighbours without numeric precision exhaustion", async () => {
    const { services } = setup();
    const first = await services.journal.create({ kind: "note", title: "First", placement: "last" });
    const last = await services.journal.create({ kind: "note", title: "Last", placement: "last" });
    for (let index = 0; index < 80; index += 1) {
      await services.journal.create({ kind: "note", title: `Middle ${index}`, placement: "before", anchorId: last.id });
    }
    const all = await services.journal.list();
    expect(all).toHaveLength(82);
    expect(all[0]?.id).toBe(first.id);
    expect(all[81]?.id).toBe(last.id);
    expect(all[80]?.title).toBe("Middle 79");
    await services.dispose();
  });

  it("uses the current local day for append after midnight", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-journal-midnight-"));
    roots.push(root);
    let clock = new Date(2026, 8, 27, 23, 59).toISOString();
    const services = createAppServices({ localEngine: createLocalEngine({ dataDir: root }), now: () => clock });
    const first = await services.journal.create({ kind: "note", title: "Before", placement: "last" });
    clock = new Date(2026, 8, 28, 0, 1).toISOString();
    const second = await services.journal.create({ kind: "note", title: "After", placement: "last" });
    expect(first.journalDate).toBe("2026-09-27");
    expect(second.journalDate).toBe("2026-09-28");
    expect(services.journal.today()).toBe(second.journalDate);
    await services.dispose();
  });
});
