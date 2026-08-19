import type { Database } from "@/types/database";

export type Estate = Database["public"]["Tables"]["estates"]["Row"];
export type Block = Database["public"]["Tables"]["blocks"]["Row"];
export type Harvest = Database["public"]["Tables"]["harvests"]["Row"];
export type Operation = Database["public"]["Tables"]["operations"]["Row"];
export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type FertilizerProgram = Database["public"]["Tables"]["fertilizer_programs"]["Row"];
export type FertilizerProgramItem = Database["public"]["Tables"]["fertilizer_program_items"]["Row"];
export type FertilizerExecution = Database["public"]["Tables"]["fertilizer_executions"]["Row"];
export type FertilizerExecutionItem = Database["public"]["Tables"]["fertilizer_execution_items"]["Row"];

export type EstateStage = "TBM" | "Produktif";
export type ActualSource = "PLAN" | "DIRECT";
