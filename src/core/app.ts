import { ok, type AppResult } from "./results.js";

export type AppSurface = "cli" | "tui";

export type AppDescriptor = {
  readonly name: "y-felin";
  readonly version: string;
  readonly surface: AppSurface;
  readonly message: string;
};

const VERSION = "0.0.0";

export function describeApp(surface: AppSurface): AppResult<AppDescriptor> {
  return ok({
    name: "y-felin",
    version: VERSION,
    surface,
    message:
      surface === "tui"
        ? "y-felin TUI placeholder"
        : "y-felin CLI placeholder",
  });
}
