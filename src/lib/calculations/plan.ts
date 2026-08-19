import type { Database } from "@/types/database";

type Plan = Database["public"]["Tables"]["plans"]["Row"];
type Harvest = Database["public"]["Tables"]["harvests"]["Row"];
type Operation = Database["public"]["Tables"]["operations"]["Row"];

function operationActualQuantity(plan: Pick<Plan, "type">, operation: Operation) {
  if (plan.type === "Tenaga Kerja") return Number(operation.labor_days ?? 0);
  if (plan.type === "Biaya") return Number(operation.total_cost ?? 0);
  return Number(operation.quantity ?? 0);
}

export function getPlanProgress(
  plan: Pick<Plan, "id" | "type" | "target_quantity" | "planned_date">,
  harvests: Harvest[],
  operations: Operation[],
) {
  const target = Math.max(0, Number(plan.target_quantity ?? 0));

  const actual =
    plan.type === "Panen"
      ? harvests
          .filter((h) => h.plan_id === plan.id)
          .reduce((sum, h) => sum + Number(h.weight_kg ?? 0), 0)
      : operations
          .filter((o) => o.plan_id === plan.id)
          .reduce((sum, o) => sum + operationActualQuantity(plan, o), 0);

  const remaining = Math.max(0, target - actual);
  const percentage =
    target > 0 ? (actual / target) * 100 : actual > 0 ? 100 : 0;

  const today = new Date();
  const planned = new Date(`${plan.planned_date}T23:59:59`);
  const isLate = actual <= 0 && planned.getTime() < today.getTime();

  const status =
    actual <= 0
      ? isLate
        ? "Terlambat"
        : "Terjadwal"
      : target > 0 && actual < target
        ? "Sebagian"
        : "Selesai";

  return { target, actual, remaining, percentage, status };
}

export function planActualUnit(plan: Pick<Plan, "type" | "unit">) {
  if (plan.type === "Panen") return "Kg";
  if (plan.type === "Tenaga Kerja") return "HOK";
  if (plan.type === "Biaya") return "Rp";
  return plan.unit || "";
}
