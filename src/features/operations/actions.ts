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

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Sesi login tidak valid.");
  return { supabase, userId: user.id };
}

export async function createOperation(formData: FormData) {
  const { supabase, userId } = await currentUserId();

  const estateId = requiredText(formData, "estate_id", "Kebun");
  const type = requiredText(formData, "type", "Jenis aktivitas");
  const opDate = requiredText(formData, "op_date", "Tanggal");
  const description = requiredText(formData, "description", "Uraian aktivitas");
  const blockId = text(formData, "block_id");

  const quantity = numberValue(formData, "quantity");
  const unitPrice = numberValue(formData, "unit_price");
  const laborDays = numberValue(formData, "labor_days");
  const laborRate = numberValue(formData, "labor_rate");
  const dosePerTree = numberValue(formData, "dose_per_tree");

  const { totalCost } = calculateOperationCost({
    quantity,
    unitPrice,
    laborDays,
    laborRate,
  });

  const { error } = await supabase.from("operations").insert({
    estate_id: estateId,
    block_id: blockId,
    created_by: userId,
    type,
    op_date: opDate,
    description,
    quantity,
    unit: text(formData, "unit"),
    unit_price: unitPrice,
    labor_days: laborDays,
    labor_rate: laborRate,
    worker: text(formData, "worker"),
    total_cost: totalCost,
    note: text(formData, "note"),
    dose_per_tree: dosePerTree,
    source: "DIRECT",
    plan_id: null,
    fertilizer_program_id: null,
  });

  if (error) throw new Error(`Aktivitas gagal disimpan: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/aktivitas");
  revalidatePath(`/kebun/${estateId}`);
  redirect("/aktivitas?status=created");
}

export async function updateDirectOperation(operationId: string, formData: FormData) {
  const { supabase } = await currentUserId();

  // Read first so linked PLAN/Fertilizer operations can never be silently mutated
  // from the generic Aktivitas module.
  const { data: existing, error: readError } = await supabase
    .from("operations")
    .select("id,estate_id,source,plan_id,fertilizer_program_id")
    .eq("id", operationId)
    .single();

  if (readError || !existing) throw new Error("Aktivitas tidak ditemukan.");
  if (
    existing.source !== "DIRECT" ||
    existing.plan_id ||
    existing.fertilizer_program_id
  ) {
    throw new Error(
      "Aktivitas yang berasal dari Rencana/Pemupukan harus diedit dari modul asalnya.",
    );
  }

  const type = requiredText(formData, "type", "Jenis aktivitas");
  const opDate = requiredText(formData, "op_date", "Tanggal");
  const description = requiredText(formData, "description", "Uraian aktivitas");

  const quantity = numberValue(formData, "quantity");
  const unitPrice = numberValue(formData, "unit_price");
  const laborDays = numberValue(formData, "labor_days");
  const laborRate = numberValue(formData, "labor_rate");
  const dosePerTree = numberValue(formData, "dose_per_tree");
  const { totalCost } = calculateOperationCost({
    quantity,
    unitPrice,
    laborDays,
    laborRate,
  });

  const { error } = await supabase
    .from("operations")
    .update({
      block_id: text(formData, "block_id"),
      type,
      op_date: opDate,
      description,
      quantity,
      unit: text(formData, "unit"),
      unit_price: unitPrice,
      labor_days: laborDays,
      labor_rate: laborRate,
      worker: text(formData, "worker"),
      total_cost: totalCost,
      note: text(formData, "note"),
      dose_per_tree: dosePerTree,
      updated_at: new Date().toISOString(),
    })
    .eq("id", operationId)
    .eq("source", "DIRECT");

  if (error) throw new Error(`Aktivitas gagal diperbarui: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/aktivitas");
  revalidatePath(`/aktivitas/${operationId}`);
  revalidatePath(`/kebun/${existing.estate_id}`);
  redirect(`/aktivitas/${operationId}?status=updated`);
}

export async function deleteDirectOperation(operationId: string) {
  const { supabase } = await currentUserId();

  const { data: existing, error: readError } = await supabase
    .from("operations")
    .select("id,estate_id,source,plan_id,fertilizer_program_id")
    .eq("id", operationId)
    .single();

  if (readError || !existing) throw new Error("Aktivitas tidak ditemukan.");
  if (
    existing.source !== "DIRECT" ||
    existing.plan_id ||
    existing.fertilizer_program_id
  ) {
    throw new Error(
      "Aktivitas dari Rencana/Pemupukan tidak boleh dihapus dari modul Aktivitas.",
    );
  }

  const { error } = await supabase
    .from("operations")
    .delete()
    .eq("id", operationId)
    .eq("source", "DIRECT");

  if (error) throw new Error(`Aktivitas gagal dihapus: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/aktivitas");
  revalidatePath(`/kebun/${existing.estate_id}`);
  redirect("/aktivitas?status=deleted");
}
