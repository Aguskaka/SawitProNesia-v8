import type { Database } from "@/types/database";

type Harvest = Database["public"]["Tables"]["harvests"]["Row"];
type Plan = Database["public"]["Tables"]["plans"]["Row"];

export function calculateHarvestRevenue(weightKg: number, pricePerKg: number) {
  return Math.max(0, Number(weightKg || 0)) * Math.max(0, Number(pricePerKg || 0));
}

export function calculateBjr(weightKg: number, bunches: number) {
  return bunches > 0 ? Math.max(0, Number(weightKg || 0)) / bunches : 0;
}

export function getHarvestPlanProgress(
  plan: Pick<Plan, "id" | "target_quantity">,
  harvests: Pick<Harvest, "plan_id" | "weight_kg">[],
) {
  const targetKg = Math.max(0, Number(plan.target_quantity || 0));
  const actualKg = harvests
    .filter((harvest) => harvest.plan_id === plan.id)
    .reduce((sum, harvest) => sum + Number(harvest.weight_kg || 0), 0);

  const remainingKg = Math.max(0, targetKg - actualKg);
  const percentage = targetKg > 0 ? (actualKg / targetKg) * 100 : actualKg > 0 ? 100 : 0;

  const status =
    actualKg <= 0
      ? "Terjadwal"
      : targetKg > 0 && actualKg < targetKg
        ? "Sebagian"
        : "Selesai";

  return {
    targetKg,
    actualKg,
    remainingKg,
    percentage,
    status,
  };
}
