import type { Database } from "@/types/database";

type ProgramItem = Database["public"]["Tables"]["fertilizer_program_items"]["Row"];
type ExecutionItem = Database["public"]["Tables"]["fertilizer_execution_items"]["Row"];

export function fertilizerRequirementKg(
  dosePerTree: number,
  trees: number,
  doseUnit: string,
) {
  const dose = Math.max(0, Number(dosePerTree || 0));
  const population = Math.max(0, Number(trees || 0));
  if (doseUnit === "g/pohon") return (dose * population) / 1000;
  if (doseUnit === "kg/pohon") return dose * population;
  return dose;
}

export function fertilizerProgramProgress(
  items: ProgramItem[],
  executions: ExecutionItem[],
) {
  const plannedKg = items.reduce(
    (sum, item) => sum + Number(item.requirement_kg ?? 0),
    0,
  );
  const actualKg = executions.reduce(
    (sum, item) => sum + Number(item.actual_quantity_kg ?? 0),
    0,
  );
  const remainingKg = Math.max(0, plannedKg - actualKg);
  const percentage =
    plannedKg > 0 ? (actualKg / plannedKg) * 100 : actualKg > 0 ? 100 : 0;
  const status =
    actualKg <= 0 ? "Terjadwal" : remainingKg > 0 ? "Sebagian" : "Selesai";

  return { plannedKg, actualKg, remainingKg, percentage, status };
}
