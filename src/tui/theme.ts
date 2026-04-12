export type TextStyle = {
  readonly bold?: boolean;
  readonly dimColor?: boolean;
  readonly inverse?: boolean;
  readonly color?:
    | "black"
    | "red"
    | "green"
    | "yellow"
    | "blue"
    | "magenta"
    | "cyan"
    | "white";
};

export type MarkerRole =
  | "task.empty"
  | "task.partial"
  | "task.done"
  | "note"
  | "event"
  | "message";

export type TuiTheme = {
  readonly text: TextStyle;
  readonly muted: TextStyle;
  readonly accent: TextStyle;
  readonly warning: TextStyle;
  readonly error: TextStyle;
  readonly selected: TextStyle;
  readonly topBar: TextStyle;
};

export const markerVocabulary: Record<MarkerRole, string> = {
  "task.empty": "□",
  "task.partial": "◩",
  "task.done": "■",
  note: "-",
  event: "◦",
  message: "🖂",
};

export const defaultTuiTheme: TuiTheme = {
  text: {},
  muted: { dimColor: true },
  accent: { bold: true, color: "cyan" },
  warning: { color: "yellow" },
  error: { color: "red", bold: true },
  selected: { bold: true },
  topBar: { inverse: true, bold: true },
};

export function fillLine(text: string, columns: number): string {
  return text.padEnd(Math.max(1, columns), " ");
}

export function markerForItem(input: {
  readonly kind: "task" | "note";
  readonly workflowState?: "open" | "active" | "done";
}): string {
  if (input.kind === "note") {
    return markerVocabulary.note;
  }

  if (input.workflowState === "active") {
    return markerVocabulary["task.partial"];
  }

  if (input.workflowState === "done") {
    return markerVocabulary["task.done"];
  }

  return markerVocabulary["task.empty"];
}

export function priorityMarker(input: {
  readonly priority?: "normal" | "high";
}): string {
  return input.priority === "high" ? "*" : " ";
}
