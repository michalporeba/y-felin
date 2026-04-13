import { describe, expect, it } from "vitest";
import {
  defaultTuiTheme,
  fillLine,
  markerForItem,
  markerVocabulary,
} from "./theme.js";

describe("defaultTuiTheme", () => {
  it("uses inversion for the top bar", () => {
    expect(defaultTuiTheme.topBar).toMatchObject({
      inverse: true,
      bold: true,
    });
  });

  it("keeps selected rows readable without inversion", () => {
    expect(defaultTuiTheme.selected).toMatchObject({
      bold: true,
    });
    expect(defaultTuiTheme.selected.inverse).toBeUndefined();
    expect(defaultTuiTheme.selected.color).toBeUndefined();
  });
});

describe("fillLine", () => {
  it("pads text to the requested width", () => {
    expect(fillLine("abc", 6)).toBe("abc   ");
  });

  it("never returns an empty string", () => {
    expect(fillLine("", 0)).toBe(" ");
  });
});

describe("marker vocabulary", () => {
  it("maps live item kinds to leading markers", () => {
    expect(
      markerForItem({
        id: "task-open",
        kind: "task",
        title: "Task",
        createdAt: "2026-04-09T00:00:00.000Z",
        priority: "normal",
        workflowState: "open",
      }),
    ).toBe("□");
    expect(
      markerForItem({
        id: "task-active",
        kind: "task",
        title: "Task",
        createdAt: "2026-04-09T00:00:00.000Z",
        priority: "normal",
        workflowState: "active",
      }),
    ).toBe("◩");
    expect(
      markerForItem({
        id: "task-done",
        kind: "task",
        title: "Task",
        createdAt: "2026-04-09T00:00:00.000Z",
        priority: "normal",
        workflowState: "done",
      }),
    ).toBe("■");
    expect(
      markerForItem({
        id: "note-1",
        kind: "note",
        title: "Note",
        createdAt: "2026-04-09T00:00:00.000Z",
      }),
    ).toBe("-");
  });

  it("reserves future markers for task states and entry kinds", () => {
    expect(markerVocabulary["task.partial"]).toBe("◩");
    expect(markerVocabulary["task.done"]).toBe("■");
    expect(markerVocabulary.event).toBe("◦");
    expect(markerVocabulary.message).toBe("🖂");
  });
});
