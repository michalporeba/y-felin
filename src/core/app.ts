import { ok, type AppResult } from "./results.js";

export type AppSurface = "cli" | "tui";

export type AppDescriptor = {
  readonly name: "melin";
  readonly version: string;
  readonly surface: AppSurface;
  readonly message: string;
};

const VERSION = "0.0.0";

export function describeApp(surface: AppSurface): AppResult<AppDescriptor> {
  return ok({
    name: "melin",
    version: VERSION,
    surface,
    message:
      surface === "tui"
        ? "Melin TUI placeholder"
        : "Melin CLI placeholder",
  });
}
