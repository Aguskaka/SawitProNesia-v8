import type { Database } from "@/types/database";
import { getPlanProgress } from "@/lib/calculations/plan";

type Plan = Database["public"]["Tables"]["plans"]["Row"];
type Harvest = Database["public"]["Tables"]["harvests"]["Row"];
type Operation = Database["public"]["Tables"]["operations"]["Row"];

export type CalendarPlanStatus =
  | "Selesai"
  | "Sebagian"
  | "Terlambat"
  | "Hari Ini"
  | "Reminder"
  | "Terjadwal";

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function subtractDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - Math.max(0, days));
  return dateOnly(d);
}

export function getCalendarPlanStatus(
  plan: Plan,
  harvests: Harvest[],
  operations: Operation[],
  todayIso: string,
): CalendarPlanStatus {
  const progress = getPlanProgress(plan, harvests, operations);

  if (progress.status === "Selesai") return "Selesai";
  if (progress.status === "Sebagian") return "Sebagian";
  if (progress.status === "Terlambat") return "Terlambat";

  if (plan.planned_date === todayIso) return "Hari Ini";

  const reminderStart = subtractDays(
    plan.planned_date,
    Number(plan.reminder_days ?? 0),
  );

  if (todayIso >= reminderStart && todayIso < plan.planned_date) {
    return "Reminder";
  }

  return "Terjadwal";
}

export function reminderStartDate(plan: Pick<Plan, "planned_date" | "reminder_days">) {
  return subtractDays(plan.planned_date, Number(plan.reminder_days ?? 0));
}

export function statusSortWeight(status: CalendarPlanStatus) {
  const order: Record<CalendarPlanStatus, number> = {
    "Terlambat": 0,
    "Hari Ini": 1,
    "Reminder": 2,
    "Sebagian": 3,
    "Terjadwal": 4,
    "Selesai": 5,
  };
  return order[status];
}
