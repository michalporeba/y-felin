import { describe, expect, it } from "vitest";
import {
  compileKeymap,
  defaultKeymapConfig,
  parseBindingExpression,
  primaryBindingForAction,
  strokeFromInput,
} from "../src/tui/keymap.js";

describe("tui keymap", () => {
  it("parses single keys, modified keys, and sequences", () => {
    expect(parseBindingExpression("q", "<space>")).toEqual({
      normalized: "q",
      parts: ["q"],
    });

    expect(parseBindingExpression("<ctrl>+n", "<space>")).toEqual({
      normalized: "<ctrl>+n",
      parts: ["<ctrl>+n"],
    });

    expect(parseBindingExpression("g g", "<space>")).toEqual({
      normalized: "g g",
      parts: ["g", "g"],
    });
  });

  it("expands leader and preserves escaped literal syntax characters", () => {
    expect(parseBindingExpression("<leader> q", "<space>")).toEqual({
      normalized: "<space> q",
      parts: ["<space>", "q"],
    });

    expect(parseBindingExpression("<lt> <gt> <=>", "<space>")).toEqual({
      normalized: "<lt> <gt> <=>",
      parts: ["<lt>", "<gt>", "<=>"],
    });
  });

  it("keeps default arrow bindings available and emits matching runtime strokes", () => {
    const compiled = compileKeymap(defaultKeymapConfig, "inbox");

    expect(compiled.bindings.get("<down>")).toBe("cursor.down");
    expect(compiled.bindings.get("<up>")).toBe("cursor.up");
    expect(strokeFromInput("", { downArrow: true })).toBe("<down>");
    expect(strokeFromInput("", { upArrow: true })).toBe("<up>");
  });

  it("merges perspective bindings over the global keymap", () => {
    const compiled = compileKeymap(defaultKeymapConfig, "inbox");

    expect(primaryBindingForAction(compiled, "app.quit")).toBe("q");
    expect(primaryBindingForAction(compiled, "entry.workflow.previous")).toBe("h");
    expect(primaryBindingForAction(compiled, "entry.workflow.next")).toBe("l");
    expect(primaryBindingForAction(compiled, "entry.create.task")).toBe("t");
    expect(primaryBindingForAction(compiled, "entry.create.note")).toBe("n");
    expect(primaryBindingForAction(compiled, "entry.edit")).toBe("e");
  });

  it("drops stale advertised bindings when a perspective overrides a global key", () => {
    const compiled = compileKeymap(
      {
        leader: "<space>",
        global: {
          q: "app.quit",
          "?": "help.context",
        },
        perspectives: {
          inbox: {
            q: "help.context",
          },
        },
      },
      "inbox",
    );

    expect(compiled.bindings.get("q")).toBe("help.context");
    expect(primaryBindingForAction(compiled, "help.context")).toBe("q");
    expect(primaryBindingForAction(compiled, "app.quit")).toBeNull();
  });

  it("rejects bindings that are both complete actions and sequence prefixes", () => {
    expect(() =>
      compileKeymap({
        leader: "<space>",
        global: {
          g: "app.quit",
          "g g": "help.context",
        },
        perspectives: {},
      }),
    ).toThrow("Binding cannot be both complete and prefix: g");
  });
});
