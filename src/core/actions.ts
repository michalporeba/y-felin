import type { AppServices } from "./services.js";
import type { AppResult } from "./results.js";

import type { AnyItem } from "./items.js";
import type { PerspectiveDefinition, PerspectiveId } from "./perspectives.js";
import type { SyncState } from "./sync.js";

export type ActionId =
  | "perspectives.list"
  | "perspectives.show"
  | "items.list"
  | "items.create"
  | "items.update"
  | "items.workflow.next"
  | "items.workflow.previous"
  | "items.priority.toggle"
  | "sync.state";

export type ActionMap = {
  "perspectives.list": {
    input: void;
    output: PerspectiveId[];
  };
  "perspectives.show": {
    input: { perspectiveId: string };
    output: PerspectiveDefinition;
  };
  "items.list": {
    input: { limit?: number } | void;
    output: AnyItem[];
  };
  "items.create": {
    input: { kind: AnyItem["kind"]; title: string };
    output: AnyItem;
  };
  "items.update": {
    input: { id: string; title: string };
    output: AnyItem;
  };
  "items.workflow.next": {
    input: { id: string };
    output: AnyItem;
  };
  "items.workflow.previous": {
    input: { id: string };
    output: AnyItem;
  };
  "items.priority.toggle": {
    input: { id: string };
    output: AnyItem;
  };
  "sync.state": {
    input: void;
    output: SyncState;
  };
};

export type ActionDefinition<TActionId extends ActionId> = {
  readonly id: TActionId;
  readonly run: (
    input: ActionMap[TActionId]["input"],
    services: AppServices,
  ) =>
    | Promise<ActionMap[TActionId]["output"]>
    | Promise<AppResult<ActionMap[TActionId]["output"]>>
    | ActionMap[TActionId]["output"]
    | AppResult<ActionMap[TActionId]["output"]>;
};

export type AnyActionDefinition = {
  [TActionId in ActionId]: ActionDefinition<TActionId>;
}[ActionId];
