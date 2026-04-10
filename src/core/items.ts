export type ItemKind = "task" | "note";

export type ItemSummary = {
  readonly id: string;
  readonly kind: ItemKind;
  readonly title: string;
  readonly createdAt: string;
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
