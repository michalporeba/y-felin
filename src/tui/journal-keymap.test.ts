import { describe, expect, it } from "vitest";
import { defaultJournalKeymap, parseJournalKeymapOverrides, resolveJournalStroke } from "./journal-keymap.js";
import { loadJournalUiConfig } from "./journal-config.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("journal command grammar", () => {
  it("keeps prefix commands unambiguous across all six entry types", () => {
    const map = defaultJournalKeymap();
    expect(resolveJournalStroke(map, "", "i")).toMatchObject({ state: "pending" });
    expect(resolveJournalStroke(map, "i", "t")).toEqual({ state: "command", command: { type: "capture", kind: "task", placement: "before", today: false } });
    expect(resolveJournalStroke(map, "a", "n")).toEqual({ state: "command", command: { type: "capture", kind: "note", placement: "last", today: true } });
    expect(resolveJournalStroke(map, "a h", "n")).toEqual({ state: "command", command: { type: "capture", kind: "note", placement: "after", today: false } });
    expect(resolveJournalStroke(map, "i f", "i")).toEqual({ state: "command", command: { type: "capture", kind: "idea", placement: "first", today: false } });
    expect(resolveJournalStroke(map, "g", "t")).toEqual({ state: "command", command: { type: "day", target: "today" } });
  });

  it("does not reinterpret an invalid pending sequence as another command", () => {
    const map = defaultJournalKeymap();
    expect(resolveJournalStroke(map, "a h", "q")).toEqual({ state: "invalid" });
    expect(() => defaultJournalKeymap({ i: { type: "help" } })).toThrow("Ambiguous journal binding");
  });

  it("loads action-id overrides and permits removing a default", () => {
    const map = defaultJournalKeymap(parseJournalKeymapOverrides({ "i t": null, "z n": "capture.today.note" }));
    expect(resolveJournalStroke(map, "i", "t")).toEqual({ state: "invalid" });
    expect(resolveJournalStroke(map, "z", "n")).toEqual({ state: "command", command: { type: "capture", kind: "note", placement: "last", today: true } });
    expect(() => parseJournalKeymapOverrides({ "x": "nonexistent.action" })).toThrow("Unknown journal action");
  });

  it("reads the user-editable journal config from the selected data directory", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "y-felin-journal-config-"));
    try {
      fs.writeFileSync(path.join(root, "journal-config.json"), JSON.stringify({ dayOrder: "newest-first", keybindings: { "z n": "capture.today.note" } }));
      const config = loadJournalUiConfig(root);
      expect(config.dayOrder).toBe("newest-first");
      expect(resolveJournalStroke(defaultJournalKeymap(config.keybindings), "z", "n")).toMatchObject({ state: "command" });
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});
