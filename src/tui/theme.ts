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

export type TuiTheme = {
  readonly text: TextStyle;
  readonly muted: TextStyle;
  readonly accent: TextStyle;
  readonly warning: TextStyle;
  readonly error: TextStyle;
  readonly selected: TextStyle;
  readonly topBar: TextStyle;
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
