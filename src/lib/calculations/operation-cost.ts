export type OperationCostInput = {
  quantity: number;
  unitPrice: number;
  laborDays: number;
  laborRate: number;
};

export function calculateOperationCost(input: OperationCostInput) {
  const materialCost =
    Math.max(0, Number(input.quantity || 0)) *
    Math.max(0, Number(input.unitPrice || 0));

  const laborCost =
    Math.max(0, Number(input.laborDays || 0)) *
    Math.max(0, Number(input.laborRate || 0));

  return {
    materialCost,
    laborCost,
    totalCost: materialCost + laborCost,
  };
}
