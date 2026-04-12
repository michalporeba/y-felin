import { appError } from "./errors.js";
import { err, ok, type AppResult } from "./results.js";

export type PerspectiveId = "inbox";

export type PerspectiveDefinition = {
  readonly id: PerspectiveId;
  readonly title: string;
  readonly summary: string;
};

export type PerspectiveHelpEntry = {
  readonly label: string;
  readonly description: string;
};

export type PerspectiveHelpDefinition = {
  readonly title: string;
  readonly summary: string;
  readonly symbols: readonly PerspectiveHelpEntry[];
};

const perspectives = [
  {
    id: "inbox",
    title: "Inbox",
    summary: "Primary perspective for capturing and reviewing items.",
  },
] as const satisfies readonly PerspectiveDefinition[];

const perspectiveHelp = {
  inbox: {
    title: "Inbox Help",
    summary: "Actions and symbols for the chronological inbox perspective.",
    symbols: [
      { label: ">", description: "Marks the currently selected row." },
      { label: "*", description: "Marks a high-priority entry." },
      { label: "□", description: "Task entry." },
      { label: "-", description: "Note entry." },
    ],
  },
} as const satisfies Record<PerspectiveId, PerspectiveHelpDefinition>;

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

export function getPerspectiveHelp(
  perspectiveId: string,
): AppResult<PerspectiveHelpDefinition> {
  const help = perspectiveHelp[perspectiveId as PerspectiveId];

  if (!help) {
    return err(
      appError("not_found", `Unknown perspective: ${perspectiveId}`),
    );
  }

  return ok(help);
}
