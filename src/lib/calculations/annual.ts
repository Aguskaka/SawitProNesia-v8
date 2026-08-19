import type { Harvest, Operation } from "@/types/domain";

export function transactionYear(date: string | null | undefined) {
  const match = String(date ?? "").match(/^(\d{4})/);
  return match ? Number(match[1]) : Number.NaN;
}

export function annualProduction(
  harvests: Harvest[],
  estateId: string | "ALL",
  year: number,
) {
  return harvests
    .filter(
      (h) =>
        (estateId === "ALL" || h.estate_id === estateId) &&
        transactionYear(h.harvest_date) === year,
    )
    .reduce((sum, h) => sum + Number(h.weight_kg ?? 0), 0);
}

export function annualRevenue(
  harvests: Harvest[],
  estateId: string | "ALL",
  year: number,
) {
  return harvests
    .filter(
      (h) =>
        (estateId === "ALL" || h.estate_id === estateId) &&
        transactionYear(h.harvest_date) === year,
    )
    .reduce((sum, h) => sum + Number(h.revenue ?? 0), 0);
}

export function annualCost(
  operations: Operation[],
  estateId: string | "ALL",
  year: number,
) {
  return operations
    .filter(
      (o) =>
        (estateId === "ALL" || o.estate_id === estateId) &&
        transactionYear(o.op_date) === year,
    )
    .reduce((sum, o) => sum + Number(o.total_cost ?? 0), 0);
}

export function annualSummary(
  harvests: Harvest[],
  operations: Operation[],
  estateId: string | "ALL",
  year: number,
) {
  const productionKg = annualProduction(harvests, estateId, year);
  const revenue = annualRevenue(harvests, estateId, year);
  const cost = annualCost(operations, estateId, year);

  return {
    productionKg,
    revenue,
    cost,
    margin: revenue - cost,
  };
}


export function monthlyProductionSeries(
  harvests: Harvest[],
  estateId: string,
  year: number,
) {
  const values = Array.from({ length: 12 }, () => 0);

  harvests
    .filter(
      (h) =>
        h.estate_id === estateId &&
        transactionYear(h.harvest_date) === year,
    )
    .forEach((h) => {
      const match = String(h.harvest_date ?? "").match(/^\d{4}-(\d{2})/);
      const month = match ? Number(match[1]) - 1 : -1;
      if (month >= 0 && month <= 11) {
        values[month] += Number(h.weight_kg ?? 0);
      }
    });

  return values;
}

export function costPerKg(productionKg: number, cost: number) {
  return productionKg > 0 ? cost / productionKg : 0;
}

export function tonPerHa(productionKg: number, areaHa: number) {
  return areaHa > 0 ? productionKg / 1000 / areaHa : 0;
}
