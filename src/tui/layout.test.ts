import { describe, expect, it } from "vitest";
import { resolveShellLayout } from "./layout.js";

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
