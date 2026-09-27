import fs from "node:fs";
import path from "node:path";
import { resolveLocalStorageConfig } from "../local/config.js";
import { parseJournalKeymapOverrides, type JournalKeymapOverrides } from "./journal-keymap.js";

export type JournalUiConfig = {
  readonly dayOrder?: "oldest-first" | "newest-first";
  readonly keybindings?: JournalKeymapOverrides;
};

export function loadJournalUiConfig(dataDir?: string): JournalUiConfig {
  const directory = resolveLocalStorageConfig(dataDir ? { dataDir } : {}).dataDir;
  const file = path.join(directory, "journal-config.json");
  if (!fs.existsSync(file)) return {};
  const value: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("journal-config.json must contain an object.");
  const config = value as Record<string, unknown>;
  if (config.dayOrder !== undefined && config.dayOrder !== "oldest-first" && config.dayOrder !== "newest-first") throw new Error("Invalid journal dayOrder.");
  let keybindings: JournalKeymapOverrides | undefined;
  if (config.keybindings !== undefined) {
    if (!config.keybindings || typeof config.keybindings !== "object" || Array.isArray(config.keybindings)) throw new Error("journal keybindings must be an object.");
    const bindings = config.keybindings as Record<string, unknown>;
    if (Object.values(bindings).some((entry) => entry !== null && typeof entry !== "string")) throw new Error("journal keybindings must name actions or null.");
    keybindings = parseJournalKeymapOverrides(bindings as Record<string, string | null>);
  }
  return { ...(config.dayOrder ? { dayOrder: config.dayOrder } : {}), ...(keybindings ? { keybindings } : {}) };
}
