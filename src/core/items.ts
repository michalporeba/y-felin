export type ItemKind = "task" | "note";
export type WorkflowState = "open" | "active" | "done";

export type ItemSummary = {
  readonly id: string;
  readonly kind: ItemKind;
  readonly title: string;
  readonly createdAt: string;
  readonly workflowState?: WorkflowState;
};

export function compareItemsOldestFirst(
  left: ItemSummary,
  right: ItemSummary,
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
