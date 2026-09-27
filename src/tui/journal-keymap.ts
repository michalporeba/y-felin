import { journalKinds, type JournalKind, type Placement } from "../core/journal.js";

export type JournalCommand =
  | { readonly type: "capture"; readonly kind: JournalKind; readonly placement: Placement; readonly today: boolean }
  | { readonly type: "move"; readonly direction: -1 | 1 }
  | { readonly type: "edge"; readonly edge: "first" | "last" }
  | { readonly type: "page"; readonly direction: -1 | 1 }
  | { readonly type: "day"; readonly target: "today" | "choose" | "previous" | "next" }
  | { readonly type: "view" | "preview" | "edit" | "heading" | "help" | "quit" | "toggle-order" }
  | { readonly type: "pane"; readonly target: "journal" | "details" | "close" }
  | { readonly type: "workflow"; readonly direction: "next" | "previous" }
  | { readonly type: "priority" };

export type JournalKeymap = ReadonlyMap<string, JournalCommand>;
export type JournalKeymapOverrides = Readonly<Record<string, JournalCommand | null>>;

export function defaultJournalKeymap(overrides: JournalKeymapOverrides = {}): JournalKeymap {
  const map = new Map<string, JournalCommand>();
  const bind = (keys: string, command: JournalCommand) => map.set(keys, command);
  for (const kind of journalKinds) {
    const suffix = { note: "n", idea: "i", task: "t", event: "e", checklist: "c", appointment: "a" }[kind];
    for (const [prefix, placement, today] of [
      ["i", "before", false], ["a h", "after", false], ["i f", "first", false],
      ["i l", "last", false], ["a", "last", true],
    ] as const) bind(`${prefix} ${suffix}`, { type: "capture", kind, placement, today });
  }
  bind("j", { type: "move", direction: 1 });
  bind("k", { type: "move", direction: -1 });
  bind("<down>", { type: "move", direction: 1 });
  bind("<up>", { type: "move", direction: -1 });
  bind("g g", { type: "edge", edge: "first" });
  bind("G", { type: "edge", edge: "last" });
  bind("<ctrl>+d", { type: "page", direction: 1 });
  bind("<ctrl>+u", { type: "page", direction: -1 });
  bind("g t", { type: "day", target: "today" });
  bind("g d", { type: "day", target: "choose" });
  bind("[ d", { type: "day", target: "previous" });
  bind("] d", { type: "day", target: "next" });
  bind("g v", { type: "view" });
  bind("z o", { type: "toggle-order" });
  bind("o", { type: "preview" });
  bind("e", { type: "edit" });
  bind("<enter>", { type: "heading" });
  bind("<ctrl>+w h", { type: "pane", target: "journal" });
  bind("<ctrl>+w l", { type: "pane", target: "details" });
  bind("<ctrl>+w c", { type: "pane", target: "close" });
  bind("h", { type: "workflow", direction: "previous" });
  bind("l", { type: "workflow", direction: "next" });
  bind("p", { type: "priority" });
  bind("?", { type: "help" });
  bind("H", { type: "help" });
  bind("q", { type: "quit" });
  for (const [keys, command] of Object.entries(overrides)) {
    if (command === null) map.delete(keys);
    else map.set(keys, command);
  }
  for (const key of map.keys()) {
    for (const other of map.keys()) {
      if (other.startsWith(`${key} `)) throw new Error(`Ambiguous journal binding: ${key}`);
    }
  }
  return map;
}

export function journalCommandId(command: JournalCommand): string {
  switch (command.type) {
    case "capture": return `capture.${command.today ? "today" : command.placement}.${command.kind}`;
    case "move": case "page": return `${command.type}.${command.direction === 1 ? "down" : "up"}`;
    case "edge": return `edge.${command.edge}`;
    case "day": return `day.${command.target}`;
    case "pane": return `pane.${command.target}`;
    case "workflow": return `workflow.${command.direction}`;
    default: return command.type;
  }
}

export function parseJournalKeymapOverrides(input: Record<string, string | null>): JournalKeymapOverrides {
  const byId = new Map([...defaultJournalKeymap().values()].map((command) => [journalCommandId(command), command]));
  const overrides: Record<string, JournalCommand | null> = {};
  for (const [keys, id] of Object.entries(input)) {
    if (id === null) { overrides[keys] = null; continue; }
    const command = byId.get(id);
    if (!command) throw new Error(`Unknown journal action: ${id}`);
    overrides[keys] = command;
  }
  defaultJournalKeymap(overrides);
  return overrides;
}

export function resolveJournalStroke(map: JournalKeymap, pending: string, stroke: string):
  | { readonly state: "command"; readonly command: JournalCommand }
  | { readonly state: "pending"; readonly sequence: string; readonly continuations: string[] }
  | { readonly state: "invalid" } {
  const sequence = pending ? `${pending} ${stroke}` : stroke;
  const command = map.get(sequence);
  if (command) return { state: "command", command };
  const continuations = [...map.keys()].filter((key) => key.startsWith(`${sequence} `)).map((key) => key.slice(sequence.length + 1).split(" ")[0]!);
  if (continuations.length) return { state: "pending", sequence, continuations: [...new Set(continuations)] };
  return { state: "invalid" };
}
