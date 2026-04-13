export type WorkflowState = "open" | "active" | "done";
export type PriorityLevel = "normal" | "high";
export type ItemKind = "task" | "note";

export type ItemCapabilities = {
  readonly priority: boolean;
  readonly workflow: boolean;
};

export type Task = {
  readonly id: string;
  readonly kind: "task";
  readonly title: string;
  readonly createdAt: string;
  readonly priority: PriorityLevel;
  readonly workflowState: WorkflowState;
};

export type Note = {
  readonly id: string;
  readonly kind: "note";
  readonly title: string;
  readonly createdAt: string;
};

export type AnyItem = Task | Note;

export const itemCapabilities: Record<ItemKind, ItemCapabilities> = {
  task: { priority: true, workflow: true },
  note: { priority: false, workflow: false },
};

export function compareItemsOldestFirst(
  left: AnyItem,
  right: AnyItem,
): number {
  const byCreatedAt = left.createdAt.localeCompare(right.createdAt);
  if (byCreatedAt !== 0) {
    return byCreatedAt;
  }

  return left.id.localeCompare(right.id);
}

const workflowOrder: readonly WorkflowState[] = ["open", "active", "done"];

export function advanceWorkflowState(
  workflowState: WorkflowState,
): WorkflowState {
  const index = workflowOrder.indexOf(workflowState);
  return workflowOrder[Math.min(index + 1, workflowOrder.length - 1)]!;
}

export function rewindWorkflowState(
  workflowState: WorkflowState,
): WorkflowState {
  const index = workflowOrder.indexOf(workflowState);
  return workflowOrder[Math.max(index - 1, 0)]!;
}
