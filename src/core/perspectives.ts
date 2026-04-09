import { appError } from "./errors.js";
import { err, ok, type AppResult } from "./results.js";

export type PerspectiveId = "inbox";

export type PerspectiveDefinition = {
  readonly id: PerspectiveId;
  readonly title: string;
  readonly summary: string;
};

const perspectives = [
  {
    id: "inbox",
    title: "Inbox",
    summary: "Primary perspective for capturing and reviewing items.",
  },
] as const satisfies readonly PerspectiveDefinition[];

export function listPerspectives(): PerspectiveDefinition[] {
  return [...perspectives];
}

export function getPerspective(
  perspectiveId: string,
): AppResult<PerspectiveDefinition> {
  const perspective = perspectives.find((entry) => entry.id === perspectiveId);

  if (!perspective) {
    return err(
      appError("not_found", `Unknown perspective: ${perspectiveId}`),
    );
  }

  return ok(perspective);
}
