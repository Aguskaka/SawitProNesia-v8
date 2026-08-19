import type { Block, EstateStage } from "@/types/domain";

export function getEstateStage(blocks: Block[], estateId: string, selectedYear: number): EstateStage {
  const estateBlocks = blocks.filter((b) => b.estate_id === estateId);
  const ages = estateBlocks
    .map((b) => b.planting_year)
    .filter((year): year is number => typeof year === "number")
    .map((year) => selectedYear - year);

  if (ages.length > 0) {
    return ages.some((age) => age >= 3) ? "Produktif" : "TBM";
  }

  return "TBM";
}
