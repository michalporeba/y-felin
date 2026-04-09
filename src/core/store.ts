import type { ActionId, ActionMap } from "./actions.js";
import { appError } from "./errors.js";
import { createActionRegistry, type ActionRegistry } from "./registry.js";
import { ok, type AppResult } from "./results.js";
import type { AppServices } from "./services.js";
import { getPerspective } from "./perspectives.js";
import { describeApp } from "./app.js";

const registry = createActionRegistry([
  {
    id: "app.describe",
    run(input) {
      const result = describeApp(input.surface);
      if (!result.ok) {
        throw new Error(result.error.message);
      }

      return result.value;
    },
  },
  {
    id: "perspectives.list",
    run(_input, services) {
      return services.perspectives.list().map((perspective) => perspective.id);
    },
  },
  {
    id: "perspectives.show",
    run(input) {
      const result = getPerspective(input.perspectiveId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }

      return result.value;
    },
  },
  {
    id: "items.list",
    run(input, services) {
      return services.items.list(input ?? undefined);
    },
  },
  {
    id: "items.create",
    run(input, services) {
      return services.items.create(input);
    },
  },
  {
    id: "items.update",
    run(input, services) {
      return services.items.update(input);
    },
  },
  {
    id: "sync.state",
    run(_input, services) {
      return services.sync.state();
    },
  },
] as const);

export type AppStore = {
  readonly actions: ActionRegistry;
  readonly dispatch: <TActionId extends ActionId>(
    actionId: TActionId,
    input: ActionMap[TActionId]["input"],
  ) => Promise<AppResult<ActionMap[TActionId]["output"]>>;
};

export function createAppStore(services: AppServices): AppStore {
  return {
    actions: registry,
    async dispatch(actionId, input) {
      const actionResult = registry.get(actionId);
      if (!actionResult.ok) {
        return actionResult;
      }

      const action = actionResult.value;

      try {
        const value = await action.run(input as never, services);
        return ok(value);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown action failure";
        return {
          ok: false,
          error: appError("invalid_input", message),
        };
      }
    },
  };
}
