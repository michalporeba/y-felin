export type ItemSummary = {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
};

export function compareItemsNewestFirst(
  left: ItemSummary,
  right: ItemSummary,
): number {
  const byCreatedAt = right.createdAt.localeCompare(left.createdAt);
  if (byCreatedAt !== 0) {
    return byCreatedAt;
  }

  return left.id.localeCompare(right.id);
}
