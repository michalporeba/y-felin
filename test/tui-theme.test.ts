import { describe, expect, it } from "vitest";
import {
  defaultTuiTheme,
  fillLine,
  markerForItemKind,
  markerVocabulary,
} from "../src/tui/theme.js";

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
    expect(markerForItemKind("task")).toBe("□");
    expect(markerForItemKind("note")).toBe("-");
  });

  it("reserves future markers for task states and entry kinds", () => {
    expect(markerVocabulary["task.partial"]).toBe("◩");
    expect(markerVocabulary["task.done"]).toBe("■");
    expect(markerVocabulary.event).toBe("◦");
    expect(markerVocabulary.message).toBe("🖂");
  });
});
