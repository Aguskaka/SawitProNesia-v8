"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(fd: FormData, key: string) {
  const v = String(fd.get(key) ?? "").trim();
  return v || null;
}
function req(fd: FormData, key: string, label: string) {
  const v = text(fd, key);
  if (!v) throw new Error(`${label} wajib diisi.`);
  return v;
}
function num(fd: FormData, key: string) {
  const v = Number(String(fd.get(key) ?? "0"));
  if (!Number.isFinite(v) || v < 0) throw new Error(`${key} tidak valid.`);
  return v;
}

export async function createLaborActual(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Sesi login tidak valid.");

  const estateId = req(formData, "estate_id", "Kebun");
  const blockId = text(formData, "block_id");
  const laborDays = num(formData, "labor_days");
  const laborRate = num(formData, "labor_rate");

  const { error } = await supabase.from("operations").insert({
    estate_id: estateId,
    block_id: blockId,
    created_by: user.id,
    type: "Tenaga Kerja",
    op_date: req(formData, "op_date", "Tanggal"),
    description: req(formData, "description", "Uraian"),
    quantity: 0,
    unit: "HOK",
    unit_price: 0,
    labor_days: laborDays,
    labor_rate: laborRate,
    worker: text(formData, "worker"),
    total_cost: laborDays * laborRate,
    note: text(formData, "note"),
    dose_per_tree: 0,
    plan_id: null,
    fertilizer_program_id: null,
    source: "DIRECT",
  });

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/tenaga-kerja");
  revalidatePath("/aktivitas");
  revalidatePath("/laporan");
  revalidatePath("/analytics");
  redirect("/tenaga-kerja?status=created");
}
