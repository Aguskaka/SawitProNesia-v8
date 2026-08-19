"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateOperationCost } from "@/lib/calculations/operation-cost";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function requiredText(formData: FormData, key: string, label: string) {
  const value = text(formData, key);
  if (!value) throw new Error(`${label} wajib diisi.`);
  return value;
}

function numberValue(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${key} tidak valid.`);
  }
  return value;
}

function integerValue(formData: FormData, key: string, fallback = 0) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${key} tidak valid.`);
  }
  return value;
}

async function session() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Sesi login tidak valid.");
  return { supabase, userId: user.id };
}

async function validateBlock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  estateId: string,
  blockId: string | null,
) {
  if (!blockId) return;

  const { data, error } = await supabase
    .from("blocks")
    .select("id")
    .eq("id", blockId)
    .eq("estate_id", estateId)
    .single();

  if (error || !data) throw new Error("Blok tidak sesuai dengan kebun.");
}

export async function createPlan(formData: FormData) {
  const { supabase, userId } = await session();

  const estateId = requiredText(formData, "estate_id", "Kebun");
  const blockId = text(formData, "block_id");
  const type = requiredText(formData, "type", "Jenis rencana");
  const plannedDate = requiredText(formData, "planned_date", "Tanggal rencana");
  const selectedYear = Number(requiredText(formData, "selected_year", "Tahun Global"));

  if (Number(plannedDate.slice(0, 4)) !== selectedYear) {
    throw new Error(`Tanggal rencana harus berada pada Tahun Global ${selectedYear}.`);
  }

  await validateBlock(supabase, estateId, blockId);

  const targetQuantity = numberValue(formData, "target_quantity");
  const reminderDays = integerValue(formData, "reminder_days", 3);

  const { error } = await supabase.from("plans").insert({
    estate_id: estateId,
    block_id: blockId,
    created_by: userId,
    type,
    planned_date: plannedDate,
    target_quantity: targetQuantity,
    unit: text(formData, "unit"),
    note: text(formData, "note"),
    reminder_days: reminderDays,
  });

  if (error) throw new Error(`Rencana gagal disimpan: ${error.message}`);

  revalidatePath("/rencana");
  redirect("/rencana?status=created");
}

export async function updatePlan(planId: string, formData: FormData) {
  const { supabase } = await session();

  const { data: existing, error: readError } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (readError || !existing) throw new Error("Rencana tidak ditemukan.");

  const [{ count: harvestCount }, { count: operationCount }] = await Promise.all([
    supabase
      .from("harvests")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", planId),
    supabase
      .from("operations")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", planId),
  ]);

  const hasActual = Number(harvestCount ?? 0) + Number(operationCount ?? 0) > 0;

  const estateId = existing.estate_id;
  const blockId = hasActual ? existing.block_id : text(formData, "block_id");
  const type = hasActual ? existing.type : requiredText(formData, "type", "Jenis rencana");
  const plannedDate = requiredText(formData, "planned_date", "Tanggal rencana");
  const selectedYear = Number(requiredText(formData, "selected_year", "Tahun Global"));

  if (Number(plannedDate.slice(0, 4)) !== selectedYear) {
    throw new Error(`Tanggal rencana harus berada pada Tahun Global ${selectedYear}.`);
  }

  await validateBlock(supabase, estateId, blockId);

  const { error } = await supabase
    .from("plans")
    .update({
      block_id: blockId,
      type,
      planned_date: plannedDate,
      target_quantity: numberValue(formData, "target_quantity"),
      unit: text(formData, "unit"),
      note: text(formData, "note"),
      reminder_days: integerValue(formData, "reminder_days", 3),
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (error) throw new Error(`Rencana gagal diperbarui: ${error.message}`);

  revalidatePath("/rencana");
  revalidatePath(`/rencana/${planId}`);
  redirect(`/rencana/${planId}?status=updated`);
}

export async function deletePlan(planId: string) {
  const { supabase } = await session();

  const [{ count: harvestCount }, { count: operationCount }] = await Promise.all([
    supabase
      .from("harvests")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", planId),
    supabase
      .from("operations")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", planId),
  ]);

  if (Number(harvestCount ?? 0) + Number(operationCount ?? 0) > 0) {
    throw new Error(
      "Rencana yang sudah memiliki Actual tidak boleh dihapus. Hapus Actual terkait terlebih dahulu.",
    );
  }

  const { error } = await supabase.from("plans").delete().eq("id", planId);
  if (error) throw new Error(`Rencana gagal dihapus: ${error.message}`);

  revalidatePath("/rencana");
  redirect("/rencana?status=deleted");
}

export async function createPlanOperationActual(planId: string, formData: FormData) {
  const { supabase, userId } = await session();

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (planError || !plan) throw new Error("Rencana tidak ditemukan.");
  if (plan.type === "Panen") {
    redirect(`/panen/realisasi/${plan.id}`);
  }

  const blockId = plan.block_id ?? text(formData, "block_id");
  await validateBlock(supabase, plan.estate_id, blockId);

  const opDate = requiredText(formData, "op_date", "Tanggal Actual");
  const selectedYear = Number(requiredText(formData, "selected_year", "Tahun Global"));

  if (Number(opDate.slice(0, 4)) !== selectedYear) {
    throw new Error(`Tanggal Actual harus berada pada Tahun Global ${selectedYear}.`);
  }

  const quantity = numberValue(formData, "quantity");
  const laborDays = numberValue(formData, "labor_days");
  const unitPrice = numberValue(formData, "unit_price");
  const laborRate = numberValue(formData, "labor_rate");
  const dosePerTree = numberValue(formData, "dose_per_tree");

  const { totalCost } = calculateOperationCost({
    quantity,
    unitPrice,
    laborDays,
    laborRate,
  });

  const { error } = await supabase.from("operations").insert({
    estate_id: plan.estate_id,
    block_id: blockId,
    created_by: userId,
    type: plan.type,
    op_date: opDate,
    description:
      text(formData, "description") ||
      `Realisasi Rencana ${plan.type} ${plan.planned_date}`,
    quantity,
    unit: text(formData, "unit") || plan.unit,
    unit_price: unitPrice,
    labor_days: laborDays,
    labor_rate: laborRate,
    worker: text(formData, "worker"),
    total_cost: totalCost,
    note: text(formData, "note"),
    dose_per_tree: dosePerTree,
    plan_id: plan.id,
    source: "PLAN",
    fertilizer_program_id: null,
  });

  if (error) throw new Error(`Actual rencana gagal disimpan: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/rencana");
  revalidatePath(`/rencana/${plan.id}`);
  revalidatePath("/aktivitas");
  revalidatePath("/laporan");
  revalidatePath("/analytics");
  redirect(`/rencana/${plan.id}?status=actual-created`);
}
