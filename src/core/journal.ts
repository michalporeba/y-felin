import type { Triple } from "lofipod";

export const journalKinds = ["note", "idea", "task", "event", "checklist", "appointment"] as const;
export type JournalKind = (typeof journalKinds)[number];

export type JournalEntry = {
  readonly id: string;
  readonly kind: JournalKind;
  readonly title: string;
  readonly createdAt: string;
  readonly journalDate: string;
  readonly order: string;
  readonly parentId?: string;
  readonly parentUri?: string;
  readonly source?: "legacy";
  readonly priority?: "normal" | "high";
  readonly workflowState?: "open" | "active" | "done";
  readonly extraTriples?: Triple[];
};

export type JournalParagraph = {
  readonly id: string;
  readonly parentId: string;
  readonly parentUri?: string;
  readonly text: string;
  readonly createdAt: string;
  readonly order: string;
  readonly extraTriples?: Triple[];
};

export type JournalBlock =
  | { readonly type: "entry"; readonly value: JournalEntry }
  | { readonly type: "paragraph"; readonly value: JournalParagraph };

export type Placement = "before" | "after" | "first" | "last";

export function localJournalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function validJournalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
}

export function journalTitle(value: string): string {
  const title = value.trim();
  if (!title) throw new Error("Journal heading cannot be empty.");
  if (/[\r\n]/.test(title)) throw new Error("Journal heading must fit on one line.");
  return title;
}

function fraction(value: string): [bigint, bigint] {
  if (value.includes("/")) {
    const [numerator, denominator] = value.split("/");
    return [BigInt(numerator!), BigInt(denominator!)];
  }
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole, decimal = ""] = unsigned.split(".");
  const denominator = 10n ** BigInt(decimal.length);
  const numerator = BigInt(whole || "0") * denominator + BigInt(decimal || "0");
  return [negative ? -numerator : numerator, denominator];
}

function simplify(numerator: bigint, denominator: bigint): string {
  let a = numerator < 0n ? -numerator : numerator;
  let b = denominator;
  while (b) [a, b] = [b, a % b];
  const divisor = a || 1n;
  const n = numerator / divisor;
  const d = denominator / divisor;
  return d === 1n ? String(n) : `${n}/${d}`;
}

export function compareOrder(left: string, right: string): number {
  const [a, b] = fraction(left);
  const [c, d] = fraction(right);
  const difference = a * d - c * b;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

export function ordered<T extends { readonly order: string; readonly id: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => compareOrder(a.order, b.order) || a.id.localeCompare(b.id));
}

export function positionOrder<T extends { readonly id: string; readonly order: string }>(
  siblings: readonly T[],
  placement: Placement,
  anchorId?: string,
): string {
  const sorted = ordered(siblings);
  if (sorted.length === 0) return "0";
  if (placement === "first") { const [n, d] = fraction(sorted[0]!.order); return simplify(n - d, d); }
  if (placement === "last") { const [n, d] = fraction(sorted[sorted.length - 1]!.order); return simplify(n + d, d); }
  const index = sorted.findIndex((item) => item.id === anchorId);
  if (index < 0) throw new Error("Selected entry is no longer in this list.");
  const left = placement === "before" ? sorted[index - 1]?.order : sorted[index]!.order;
  const right = placement === "before" ? sorted[index]!.order : sorted[index + 1]?.order;
  if (left === undefined) { const [n, d] = fraction(right!); return simplify(n - d, d); }
  if (right === undefined) { const [n, d] = fraction(left); return simplify(n + d, d); }
  const [a, b] = fraction(left);
  const [c, d] = fraction(right);
  return simplify(a * d + c * b, 2n * b * d);
}
