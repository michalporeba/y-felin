import type { AnyItem, SyncState } from "../core/index.js";

export type HelpMode = "none" | "context" | "global";

export type ComposerState = {
  readonly mode: "idle" | "create" | "edit";
  readonly kind?: AnyItem["kind"];
  readonly value: string;
  readonly itemId?: string;
  readonly errorMessage?: string;
};

export type InboxItemsState = {
  readonly status: "loading" | "ready" | "error";
  readonly items: AnyItem[];
  readonly errorMessage?: string;
};

export type TuiInputKey = {
  readonly escape?: boolean;
  readonly return?: boolean;
  readonly backspace?: boolean;
  readonly delete?: boolean;
  readonly ctrl?: boolean;
  readonly meta?: boolean;
};
