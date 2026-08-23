"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateHarvestRevenue } from "@/lib/calculations/harvest";
import { assertHarvestCreateAccess, assertHarvestDeleteAccess, assertHarvestEditAccess } from "@/lib/auth/access";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function requiredText(formData: FormData, key: string, label: string) {
  const value = text(formData, key);
  if (!value) throw new Error(`${label} wajib diisi.`);
  return value;
}

function numberValue(formData: FormData, key: string, label = key) {
  const raw = String(formData.get(key) ?? "").trim();
  const value = Number(raw);
  if (!raw || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} tidak valid.`);
  }
  return value;
}

function nonNegativeInteger(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "0").trim();
  const value = Number(raw || 0);
  if (!Number.isInteger(value) || value < 0) throw new Error(`${key} tidak valid.`);
  return value;
}

function dateYear(date: string) {
  return Number(String(date).slice(0, 4));
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

async function validateEstateBlock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  estateId: string,
  blockId: string,
) {
  const { data: block, error } = await supabase
    .from("blocks")
    .select("id,estate_id,name")
    .eq("id", blockId)
    .eq("estate_id", estateId)
    .single();

  if (error || !block) throw new Error("Blok tidak sesuai dengan kebun terpilih.");
  return block;
}

export async function createHarvest(formData: FormData) {
  const { supabase, userId } = await session();

  const estateId = requiredText(formData, "estate_id", "Kebun");
  const access = await assertHarvestCreateAccess(estateId);
  const blockId = requiredText(formData, "block_id", "Blok");
  const harvestDate = requiredText(formData, "harvest_date", "Tanggal panen");
  const selectedYear = Number(requiredText(formData, "selected_year", "Tahun Global"));
  const source = requiredText(formData, "source", "Sumber panen") === "PLAN" ? "PLAN" : "DIRECT";

  if (access.role === "pemanen" && source !== "DIRECT") throw new Error("Pemanen hanya dapat mencatat Panen DIRECT.");

  if (dateYear(harvestDate) !== selectedYear) {
    throw new Error(`Tanggal panen harus berada pada Tahun Global ${selectedYear}.`);
  }

  await validateEstateBlock(supabase, estateId, blockId);

  const weightKg = numberValue(formData, "weight_kg", "Berat TBS");
  if (weightKg <= 0) throw new Error("Berat TBS harus lebih dari 0 Kg.");

  const bunches = nonNegativeInteger(formData, "bunches");
  const pricePerKg = numberValue(formData, "price_per_kg", "Harga/Kg");
  const revenue = calculateHarvestRevenue(weightKg, pricePerKg);

  let planId: string | null = null;

  if (source === "PLAN") {
    planId = requiredText(formData, "plan_id", "Rencana Panen");
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id,estate_id,block_id,type,planned_date,target_quantity")
      .eq("id", planId)
      .single();

    if (planError || !plan) throw new Error("Rencana Panen tidak ditemukan.");
    if (plan.type !== "Panen") throw new Error("Rencana terpilih bukan Rencana Panen.");
    if (plan.estate_id !== estateId) throw new Error("Rencana Panen berasal dari kebun yang berbeda.");
    if (plan.block_id && plan.block_id !== blockId) {
      throw new Error("Blok actual harus sama dengan blok pada Rencana Panen.");
    }
  }

  const { error } = await supabase.from("harvests").insert({
    estate_id: estateId,
    block_id: blockId,
    created_by: userId,
    harvest_date: harvestDate,
    weight_kg: weightKg,
    bunches,
    price_per_kg: pricePerKg,
    revenue,
    worker: text(formData, "worker"),
    note: text(formData, "note"),
    plan_id: planId,
    source,
  });

  if (error) throw new Error(`Panen gagal disimpan: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/panen");
  revalidatePath("/aktivitas");
  revalidatePath(`/kebun/${estateId}`);
  redirect("/panen?status=created");
}

export async function updateHarvestActual(harvestId: string, formData: FormData) {
  const { supabase } = await session();
  await assertHarvestEditAccess();

  const { data: existing, error: readError } = await supabase
    .from("harvests")
    .select("id,estate_id,block_id,source,plan_id")
    .eq("id", harvestId)
    .single();

  if (readError || !existing) throw new Error("Transaksi panen tidak ditemukan.");

  const blockId = requiredText(formData, "block_id", "Blok");
  const harvestDate = requiredText(formData, "harvest_date", "Tanggal panen");
  const selectedYear = Number(requiredText(formData, "selected_year", "Tahun Global"));

  if (dateYear(harvestDate) !== selectedYear) {
    throw new Error(`Tanggal panen harus berada pada Tahun Global ${selectedYear}.`);
  }

  await validateEstateBlock(supabase, existing.estate_id, blockId);

  if (existing.plan_id) {
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id,estate_id,block_id,type")
      .eq("id", existing.plan_id)
      .single();

    if (planError || !plan) throw new Error("Rencana Panen asal tidak ditemukan.");
    if (plan.block_id && plan.block_id !== blockId) {
      throw new Error("Blok actual PLAN tidak boleh berbeda dari blok rencana.");
    }
  }

  const weightKg = numberValue(formData, "weight_kg", "Berat TBS");
  if (weightKg <= 0) throw new Error("Berat TBS harus lebih dari 0 Kg.");

  const bunches = nonNegativeInteger(formData, "bunches");
  const pricePerKg = numberValue(formData, "price_per_kg", "Harga/Kg");
  const revenue = calculateHarvestRevenue(weightKg, pricePerKg);

  // Critical integrity rule: UPDATE existing actual only.
  // source and plan_id are intentionally not changed here.
  const { error } = await supabase
    .from("harvests")
    .update({
      block_id: blockId,
      harvest_date: harvestDate,
      weight_kg: weightKg,
      bunches,
      price_per_kg: pricePerKg,
      revenue,
      worker: text(formData, "worker"),
      note: text(formData, "note"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", harvestId);

  if (error) throw new Error(`Panen gagal diperbarui: ${error.message}`);

  revalidatePath("/");
  revalidatePath("/panen");
  revalidatePath(`/panen/${harvestId}`);
  revalidatePath("/aktivitas");
  revalidatePath(`/kebun/${existing.estate_id}`);
  redirect(`/panen/${harvestId}?status=updated`);
}

export async function deleteHarvestActual(harvestId: string) {
  const { supabase } = await session();
  await assertHarvestDeleteAccess();

  const { data: existing, error: readError } = await supabase
    .from("harvests")
    .select("id,estate_id")
    .eq("id", harvestId)
    .single();

  if (readError || !existing) throw new Error("Transaksi panen tidak ditemukan.");

  const { error } = await supabase.from("harvests").delete().eq("id", harvestId);
  if (error) throw new Error(`Panen gagal dihapus: ${error.message}`);

  // Plan progress is derived from harvest rows, so removing this row
  // automatically recalculates cumulative actual on the next render.
  revalidatePath("/");
  revalidatePath("/panen");
  revalidatePath("/aktivitas");
  revalidatePath(`/kebun/${existing.estate_id}`);
  redirect("/panen?status=deleted");
}
