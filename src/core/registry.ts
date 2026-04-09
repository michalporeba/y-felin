import type { AnyActionDefinition, ActionDefinition, ActionId, ActionMap } from "./actions.js";
import { appError } from "./errors.js";
import { err, ok, type AppResult } from "./results.js";

export type ActionRegistry = {
  readonly get: <TActionId extends ActionId>(
    actionId: TActionId,
  ) => AppResult<ActionDefinition<TActionId>>;
  readonly list: () => ActionId[];
};

export function createActionRegistry(
  actions: readonly AnyActionDefinition[],
): ActionRegistry {
  const entries = new Map<ActionId, AnyActionDefinition>();
  for (const action of actions) {
    entries.set(action.id, action);
  }

  return {
    get(actionId) {
      const action = entries.get(actionId);

      if (!action) {
        return err(appError("not_found", `Unknown action: ${actionId}`));
      }

      return ok(action as ActionDefinition<typeof actionId>);
    },
    list() {
      return [...entries.keys()];
    },
  };
}
