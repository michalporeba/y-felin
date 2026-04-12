import type { PerspectiveId } from "../core/index.js";

export type TuiActionId =
  | "app.quit"
  | "help.context"
  | "help.global"
  | "cursor.down"
  | "cursor.up"
  | "entry.workflow.previous"
  | "entry.workflow.next"
  | "entry.priority.toggle"
  | "entry.create.task"
  | "entry.create.note"
  | "entry.edit";

export type KeymapConfig = {
  readonly leader: string;
  readonly global: Record<string, TuiActionId>;
  readonly perspectives: Partial<Record<PerspectiveId, Record<string, TuiActionId>>>;
};

export type ActionHelpEntry = {
  readonly actionId: TuiActionId;
  readonly description: string;
};

export type CompiledKeymap = {
  readonly bindings: ReadonlyMap<string, TuiActionId>;
  readonly prefixes: ReadonlySet<string>;
  readonly displayByAction: ReadonlyMap<TuiActionId, string[]>;
};

export const defaultKeymapConfig: KeymapConfig = {
  leader: "<space>",
  global: {
    j: "cursor.down",
    k: "cursor.up",
    "<down>": "cursor.down",
    "<up>": "cursor.up",
    q: "app.quit",
    "?": "help.context",
    H: "help.global",
  },
  perspectives: {
    inbox: {
      h: "entry.workflow.previous",
      l: "entry.workflow.next",
      p: "entry.priority.toggle",
      t: "entry.create.task",
      n: "entry.create.note",
      e: "entry.edit",
    },
  },
};

const actionDescriptions: Record<TuiActionId, string> = {
  "app.quit": "Quit the application.",
  "help.context": "Open contextual help for the current perspective.",
  "help.global": "Open the main help document.",
  "cursor.down": "Move the current selection down.",
  "cursor.up": "Move the current selection up.",
  "entry.workflow.previous": "Move the selected task one workflow step toward open.",
  "entry.workflow.next": "Move the selected task one workflow step toward done.",
  "entry.priority.toggle": "Toggle the selected entry between normal and high priority.",
  "entry.create.task": "Create a new task at the bottom of the inbox.",
  "entry.create.note": "Create a new note at the bottom of the inbox.",
  "entry.edit": "Edit the selected entry title in place.",
};

const perspectiveActions: Record<PerspectiveId, TuiActionId[]> = {
  inbox: [
    "cursor.down",
    "cursor.up",
    "entry.workflow.previous",
    "entry.workflow.next",
    "entry.priority.toggle",
    "entry.create.task",
    "entry.create.note",
    "entry.edit",
    "help.context",
    "help.global",
    "app.quit",
  ],
};

type ParsedGesture = {
  readonly normalized: string;
  readonly parts: string[];
};

type SpecialToken =
  | "leader"
  | "ctrl"
  | "shift"
  | "alt"
  | "meta"
  | "up"
  | "down"
  | "left"
  | "right"
  | "del"
  | "insert"
  | "esc"
  | "enter"
  | "tab"
  | "space"
  | "lt"
  | "gt"
  | "=";

const specialTokens = new Set<string>([
  "<leader>",
  "<ctrl>",
  "<shift>",
  "<alt>",
  "<meta>",
  "<up>",
  "<down>",
  "<left>",
  "<right>",
  "<del>",
  "<insert>",
  "<esc>",
  "<enter>",
  "<tab>",
  "<space>",
  "<lt>",
  "<gt>",
  "<=>",
]);

const modifierOrder = ["<ctrl>", "<alt>", "<meta>", "<shift>"] as const;

export function compileKeymap(
  config: KeymapConfig,
  perspectiveId?: PerspectiveId,
): CompiledKeymap {
  const bindings = new Map<string, TuiActionId>();

  const appendBindings = (source: Record<string, TuiActionId>) => {
    for (const [expression, actionId] of Object.entries(source)) {
      const parsed = parseBindingExpression(expression, config.leader);
      bindings.set(parsed.normalized, actionId);
    }
  };

  appendBindings(config.global);
  if (perspectiveId && config.perspectives[perspectiveId]) {
    appendBindings(config.perspectives[perspectiveId] ?? {});
  }

  const prefixes = new Set<string>();
  for (const binding of bindings.keys()) {
    const parts = binding.split(" ");
    for (let index = 1; index < parts.length; index += 1) {
      prefixes.add(parts.slice(0, index).join(" "));
    }
  }

  for (const binding of bindings.keys()) {
    if (prefixes.has(binding)) {
      throw new Error(`Binding cannot be both complete and prefix: ${binding}`);
    }
  }

  const displayByAction = new Map<TuiActionId, string[]>();
  for (const [binding, actionId] of bindings.entries()) {
    const existing = displayByAction.get(actionId) ?? [];
    displayByAction.set(actionId, [...existing, binding]);
  }

  return {
    bindings,
    prefixes,
    displayByAction,
  };
}

export function parseBindingExpression(
  expression: string,
  leader: string,
): ParsedGesture {
  const normalizedLeader = normalizeLeaderStroke(leader);
  const trimmed = expression.trim();
  if (!trimmed) {
    throw new Error("Binding expression cannot be empty.");
  }

  const strokes = splitOutsideAngles(trimmed, " ");
  const normalized = strokes
    .map((stroke) => normalizeStroke(stroke, leader, normalizedLeader))
    .join(" ");

  return {
    normalized,
    parts: normalized.split(" "),
  };
}

export function getPerspectiveActionHelp(
  perspectiveId: PerspectiveId,
): ActionHelpEntry[] {
  return perspectiveActions[perspectiveId].map((actionId) => ({
    actionId,
    description: actionDescriptions[actionId],
  }));
}

export function getGlobalHelpEntries(): ActionHelpEntry[] {
  return [
    { actionId: "help.context", description: actionDescriptions["help.context"] },
    { actionId: "help.global", description: actionDescriptions["help.global"] },
    { actionId: "app.quit", description: actionDescriptions["app.quit"] },
  ];
}

export function primaryBindingForAction(
  compiled: CompiledKeymap,
  actionId: TuiActionId,
): string | null {
  const bindings = compiled.displayByAction.get(actionId);
  return bindings?.[0] ?? null;
}

export function strokeFromInput(
  input: string,
  key: {
    readonly upArrow?: boolean;
    readonly downArrow?: boolean;
    readonly leftArrow?: boolean;
    readonly rightArrow?: boolean;
    readonly return?: boolean;
    readonly escape?: boolean;
    readonly tab?: boolean;
    readonly backspace?: boolean;
    readonly delete?: boolean;
    readonly ctrl?: boolean;
    readonly alt?: boolean;
    readonly meta?: boolean;
    readonly shift?: boolean;
  },
): string | null {
  let base: string | null = null;

  if (key.upArrow) {
    base = "<up>";
  } else if (key.downArrow) {
    base = "<down>";
  } else if (key.leftArrow) {
    base = "<left>";
  } else if (key.rightArrow) {
    base = "<right>";
  } else if (key.return) {
    base = "<enter>";
  } else if (key.escape || input === "\u001B") {
    base = "<esc>";
  } else if (key.tab) {
    base = "<tab>";
  } else if (key.delete) {
    base = "<del>";
  } else if (input === " ") {
    base = "<space>";
  } else if (input === "<") {
    base = "<lt>";
  } else if (input === ">") {
    base = "<gt>";
  } else if (input === "=") {
    base = "<=>";
  } else if (input) {
    base = input;
  }

  if (!base) {
    return null;
  }

  const modifiers: string[] = [];
  if (key.ctrl) {
    modifiers.push("<ctrl>");
  }
  if (key.alt) {
    modifiers.push("<alt>");
  }
  if (key.meta) {
    modifiers.push("<meta>");
  }
  if (key.shift && needsExplicitShift(base)) {
    modifiers.push("<shift>");
  }

  return [...modifiers, base].join("+");
}

function normalizeStroke(
  stroke: string,
  leader: string,
  normalizedLeader: string,
): string {
  const parts = splitOutsideAngles(stroke.trim(), "+");
  if (parts.length === 0) {
    throw new Error("Stroke cannot be empty.");
  }

  const modifiers: string[] = [];
  let keyPart: string | null = null;

  for (const rawPart of parts) {
    const part = normalizeToken(rawPart.trim(), leader, normalizedLeader);
    if (modifierOrder.includes(part as (typeof modifierOrder)[number])) {
      if (!modifiers.includes(part)) {
        modifiers.push(part);
      }
      continue;
    }

    if (keyPart) {
      throw new Error(`Stroke must have exactly one key part: ${stroke}`);
    }
    keyPart = part;
  }

  if (!keyPart) {
    throw new Error(`Stroke is missing key part: ${stroke}`);
  }

  modifiers.sort(
    (left, right) => modifierOrder.indexOf(left as (typeof modifierOrder)[number]) -
      modifierOrder.indexOf(right as (typeof modifierOrder)[number]),
  );

  return [...modifiers, keyPart].join("+");
}

function normalizeToken(
  token: string,
  leader: string,
  normalizedLeader: string,
): string {
  if (!token) {
    throw new Error("Binding token cannot be empty.");
  }

  if (token === leader || token.toLowerCase() === "<leader>") {
    return normalizedLeader;
  }

  const lowerToken = token.toLowerCase();
  if (specialTokens.has(lowerToken)) {
    return lowerToken;
  }

  if (token.length === 1) {
    return token;
  }

  throw new Error(`Unknown binding token: ${token}`);
}

function normalizeLeaderStroke(leader: string): string {
  const trimmedLeader = leader.trim();
  if (!trimmedLeader) {
    throw new Error("Leader cannot be empty.");
  }

  if (trimmedLeader.toLowerCase() === "<leader>") {
    throw new Error("Leader cannot reference <leader>.");
  }

  return normalizeStroke(trimmedLeader, "", "");
}

function splitOutsideAngles(input: string, separator: string): string[] {
  const result: string[] = [];
  let current = "";
  let depth = 0;

  for (const character of input) {
    if (character === "<") {
      depth += 1;
    } else if (character === ">") {
      depth = Math.max(0, depth - 1);
    }

    if (character === separator && depth === 0) {
      if (current.trim()) {
        result.push(current.trim());
      }
      current = "";
      continue;
    }

    current += character;
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}

function needsExplicitShift(base: string): boolean {
  return base.startsWith("<");
}
