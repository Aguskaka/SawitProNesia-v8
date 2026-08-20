"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fertilizerRequirementKg } from "@/lib/calculations/fertilizer";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}
function requiredText(formData: FormData, key: string, label: string) {
  const value = text(formData, key);
  if (!value) throw new Error(`${label} wajib diisi.`);
  return value;
}
function num(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${key} tidak valid.`);
  return value;
}
async function session() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Sesi login tidak valid.");
  return { supabase, user };
}

export async function createFertilizerProgram(formData: FormData) {
  const { supabase, user } = await session();
  const estateId = requiredText(formData, "estate_id", "Kebun");
  const blockId = requiredText(formData, "block_id", "Blok");
  const plannedDate = requiredText(formData, "planned_date", "Tanggal rencana");
  const selectedYear = Number(requiredText(formData, "selected_year", "Tahun Global"));

  if (Number(plannedDate.slice(0, 4)) !== selectedYear) {
    throw new Error(`Tanggal program harus berada pada Tahun Global ${selectedYear}.`);
  }

  const { data: block, error: blockError } = await supabase
    .from("blocks")
    .select("id,estate_id,trees")
    .eq("id", blockId)
    .eq("estate_id", estateId)
    .single();

  if (blockError || !block) throw new Error("Blok tidak sesuai dengan kebun.");

  const { data: program, error: programError } = await supabase
    .from("fertilizer_programs")
    .insert({
      owner_id: user.id,
      estate_id: estateId,
      block_id: blockId,
      pattern: requiredText(formData, "pattern", "Pola pupuk"),
      planned_date: plannedDate,
      period_label: text(formData, "period_label"),
      recommendation_source: text(formData, "recommendation_source"),
      status: "Terjadwal",
      note: text(formData, "note"),
      planning_mode: text(formData, "planning_mode") || "manual",
      target_age_months: num(formData, "target_age_months") || null,
    })
    .select("id")
    .single();

  if (programError || !program) {
    throw new Error(`Program pupuk gagal dibuat: ${programError?.message ?? "unknown"}`);
  }

  const rows = [];
  for (let i = 1; i <= 5; i++) {
    const fertilizerName = text(formData, `fertilizer_name_${i}`);
    if (!fertilizerName) continue;

    const customDose = num(formData, `custom_dose_${i}`);
    const standardDose = num(formData, `standard_dose_${i}`);
    const doseUnit = text(formData, `dose_unit_${i}`) || "g/pohon";
    const unitPrice = num(formData, `unit_price_${i}`);
    const manualRequirement = num(formData, `requirement_kg_${i}`);
    const basisDose = customDose > 0 ? customDose : standardDose;
    const requirementKg =
      manualRequirement > 0
        ? manualRequirement
        : fertilizerRequirementKg(basisDose, Number(block.trees ?? 0), doseUnit);

    rows.push({
      owner_id: user.id,
      program_id: program.id,
      fertilizer_name: fertilizerName,
      standard_dose: standardDose,
      custom_dose: customDose,
      dose_unit: doseUnit,
      requirement_kg: requirementKg,
      unit_price: unitPrice,
      estimated_cost: requirementKg * unitPrice,
      sort_order: i,
    });
  }

  if (!rows.length) {
    await supabase.from("fertilizer_programs").delete().eq("id", program.id);
    throw new Error("Minimal satu jenis pupuk wajib diisi.");
  }

  const { error: itemError } = await supabase
    .from("fertilizer_program_items")
    .insert(rows);

  if (itemError) {
    await supabase.from("fertilizer_programs").delete().eq("id", program.id);
    throw new Error(`Item program pupuk gagal dibuat: ${itemError.message}`);
  }

  revalidatePath("/pupuk");
  revalidatePath("/kalender");
  redirect(`/pupuk/${program.id}?status=created`);
}

export async function executeFertilizerProgram(programId: string, formData: FormData) {
  const { supabase, user } = await session();

  const { data: program, error: programError } = await supabase
    .from("fertilizer_programs")
    .select("*")
    .eq("id", programId)
    .single();
  if (programError || !program) throw new Error("Program pupuk tidak ditemukan.");

  const { data: items, error: itemError } = await supabase
    .from("fertilizer_program_items")
    .select("*")
    .eq("program_id", programId)
    .order("sort_order");
  if (itemError) throw new Error(itemError.message);

  const executionDate = requiredText(formData, "execution_date", "Tanggal realisasi");

  const { data: execution, error: executionError } = await supabase
    .from("fertilizer_executions")
    .insert({
      owner_id: user.id,
      program_id: program.id,
      estate_id: program.estate_id,
      block_id: program.block_id,
      execution_date: executionDate,
      worker: text(formData, "worker"),
      note: text(formData, "note"),
    })
    .select("id")
    .single();

  if (executionError || !execution) {
    throw new Error(`Realisasi pupuk gagal dibuat: ${executionError?.message ?? "unknown"}`);
  }

  let inserted = 0;
  for (const item of items ?? []) {
    const qty = num(formData, `qty_${item.id}`);
    if (qty <= 0) continue;

    const price = num(formData, `price_${item.id}`) || Number(item.unit_price ?? 0);
    const dose = num(formData, `dose_${item.id}`);
    const actualCost = qty * price;

    const { data: operation, error: operationError } = await supabase
      .from("operations")
      .insert({
        estate_id: program.estate_id,
        block_id: program.block_id,
        created_by: user.id,
        type: "Pemupukan",
        op_date: executionDate,
        description: `${item.fertilizer_name} · Realisasi Program Pupuk`,
        quantity: qty,
        unit: "Kg",
        unit_price: price,
        labor_days: 0,
        labor_rate: 0,
        worker: text(formData, "worker"),
        total_cost: actualCost,
        note: text(formData, "note"),
        dose_per_tree: dose,
        plan_id: null,
        fertilizer_program_id: program.id,
        source: "PLAN",
      })
      .select("id")
      .single();

    if (operationError || !operation) {
      throw new Error(`Operation pupuk gagal dibuat: ${operationError?.message ?? "unknown"}`);
    }

    const { error: execItemError } = await supabase
      .from("fertilizer_execution_items")
      .insert({
        owner_id: user.id,
        execution_id: execution.id,
        program_item_id: item.id,
        operation_id: operation.id,
        actual_quantity_kg: qty,
        actual_unit_price: price,
        actual_cost: actualCost,
        actual_dose_per_tree: dose,
      });

    if (execItemError) throw new Error(execItemError.message);
    inserted++;
  }

  if (!inserted) {
    await supabase.from("fertilizer_executions").delete().eq("id", execution.id);
    throw new Error("Isi minimal satu kuantitas realisasi pupuk.");
  }

  const [{ data: plannedItems }, { data: executions }] = await Promise.all([
    supabase.from("fertilizer_program_items").select("requirement_kg").eq("program_id", program.id),
    supabase
      .from("fertilizer_execution_items")
      .select("actual_quantity_kg, execution_id, fertilizer_executions!inner(program_id)")
      .eq("fertilizer_executions.program_id", program.id),
  ]);

  const planned = (plannedItems ?? []).reduce(
    (sum, x) => sum + Number(x.requirement_kg ?? 0),
    0,
  );
  const actual = (executions ?? []).reduce(
    (sum, x) => sum + Number(x.actual_quantity_kg ?? 0),
    0,
  );
  const finished = planned > 0 && actual >= planned;

  await supabase
    .from("fertilizer_programs")
    .update({
      status: finished ? "Selesai" : "Sebagian",
      completed_at: finished ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", program.id);

  revalidatePath("/");
  revalidatePath("/pupuk");
  revalidatePath(`/pupuk/${program.id}`);
  revalidatePath("/aktivitas");
  revalidatePath("/laporan");
  revalidatePath("/analytics");
  revalidatePath("/kalender");
  redirect(`/pupuk/${program.id}?status=executed`);
}

export async function deleteFertilizerProgram(programId: string) {
  const { supabase } = await session();

  const { count } = await supabase
    .from("fertilizer_executions")
    .select("id", { count: "exact", head: true })
    .eq("program_id", programId);

  if (Number(count ?? 0) > 0) {
    throw new Error("Program yang sudah memiliki realisasi tidak boleh dihapus.");
  }

  await supabase.from("fertilizer_program_items").delete().eq("program_id", programId);
  const { error } = await supabase.from("fertilizer_programs").delete().eq("id", programId);
  if (error) throw new Error(error.message);

  revalidatePath("/pupuk");
  revalidatePath("/kalender");
  redirect("/pupuk?status=deleted");
}
