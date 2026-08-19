import type { Database } from "@/types/database";

type Operation = Database["public"]["Tables"]["operations"]["Row"];

export function actualCostForYear(
  operations: Operation[],
  estateId: string,
  year: number,
) {
  return operations
    .filter(
      (o) =>
        o.estate_id === estateId &&
        String(o.op_date).startsWith(`${year}-`),
    )
    .reduce((sum, o) => sum + Number(o.total_cost ?? 0), 0);
}

export function budgetUsage(budget: number, actual: number) {
  const safeBudget = Math.max(0, Number(budget || 0));
  const safeActual = Math.max(0, Number(actual || 0));
  return {
    budget: safeBudget,
    actual: safeActual,
    remaining: safeBudget - safeActual,
    percentage: safeBudget > 0 ? (safeActual / safeBudget) * 100 : 0,
  };
}
