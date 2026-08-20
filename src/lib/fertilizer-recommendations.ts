export const TBM_MINERAL_COMPOUND = [
  { month: 1, urea: 150, npk: 0, dolomite: 0 },
  { month: 3, urea: 0, npk: 500, dolomite: 200 },
  { month: 5, urea: 350, npk: 500, dolomite: 200 },
  { month: 8, urea: 0, npk: 750, dolomite: 300 },
  { month: 12, urea: 350, npk: 750, dolomite: 300 },
  { month: 16, urea: 450, npk: 1000, dolomite: 500 },
  { month: 20, urea: 0, npk: 1000, dolomite: 500 },
  { month: 24, urea: 750, npk: 1500, dolomite: 750 },
  { month: 28, urea: 750, npk: 1500, dolomite: 750 },
  { month: 32, urea: 0, npk: 1500, dolomite: 1000 },
  { month: 36, urea: 1000, npk: 1500, dolomite: 1000 },
] as const;

export const TM_MINERAL_COMPOUND = [
  { age: "3–4", semester1: { bioneensis: 1.5, npk: 2.5, urea: 0.5, dolomite: 0.75, borax: 0.025 }, semester2: { npk: 2.25, bioneensis: 1.5 }, annual: 7.53 },
  { age: "5–8", semester1: { bioneensis: 1.5, npk: 3.0, urea: 0.5, dolomite: 0.75, borax: 0.025 }, semester2: { npk: 2.25, bioneensis: 1.5 }, annual: 8.03 },
  { age: "9–15", semester1: { bioneensis: 1.5, npk: 3.25, urea: 0.75, dolomite: 1.0, borax: 0.025 }, semester2: { npk: 2.75, bioneensis: 1.5 }, annual: 9.28 },
  { age: "16–20", semester1: { bioneensis: 1.5, npk: 3.0, urea: 0.5, dolomite: 0.75, borax: 0.025 }, semester2: { npk: 2.25, bioneensis: 1.5 }, annual: 8.03 },
  { age: ">20", semester1: { bioneensis: 1.25, npk: 2.5, urea: 0.5, dolomite: 0.75, borax: 0.025 }, semester2: { npk: 2.25, bioneensis: 1.25 }, annual: 7.28 },
] as const;

export const FERTILIZER_FORMULAS = {
  tbm: "NPK 12.12.17.2 + 0,75B",
  tm: "NPK 13.6.27.4 + 0,65B",
} as const;
