"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function txt(fd: FormData, key: string) {
  const v = String(fd.get(key) ?? "").trim();
  return v || null;
}
function required(fd: FormData, key: string, label: string) {
  const v = txt(fd, key);
  if (!v) throw new Error(`${label} wajib diisi.`);
  return v;
}
function amount(fd: FormData, key: string) {
  const v = Number(String(fd.get(key) ?? "0"));
  if (!Number.isFinite(v) || v < 0) throw new Error(`${key} tidak valid.`);
  return v;
}
async function session() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Sesi login tidak valid.");
  return { supabase, user };
}

export async function saveAnnualBudget(formData: FormData) {
  const { supabase, user } = await session();
  const estateId = required(formData, "estate_id", "Kebun");
  const year = Number(required(formData, "budget_year", "Tahun"));
  const value = amount(formData, "amount");

  const { data: existing } = await supabase
    .from("annual_budgets")
    .select("id")
    .eq("estate_id", estateId)
    .eq("budget_year", year)
    .maybeSingle();

  const result = existing
    ? await supabase
        .from("annual_budgets")
        .update({ amount: value, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    : await supabase.from("annual_budgets").insert({
        owner_id: user.id,
        estate_id: estateId,
        budget_year: year,
        amount: value,
      });

  if (result.error) throw new Error(result.error.message);

  revalidatePath("/");
  revalidatePath("/anggaran");
  revalidatePath("/laporan");
  revalidatePath("/analytics");
  redirect("/anggaran?status=saved");
}

export async function saveCategoryBudget(formData: FormData) {
  const { supabase, user } = await session();
  const estateId = required(formData, "estate_id", "Kebun");
  const year = Number(required(formData, "budget_year", "Tahun"));
  const category = required(formData, "category", "Kategori");
  const value = amount(formData, "amount");

  const { data: existing } = await supabase
    .from("annual_budget_categories")
    .select("id")
    .eq("estate_id", estateId)
    .eq("budget_year", year)
    .eq("category", category)
    .maybeSingle();

  const result = existing
    ? await supabase
        .from("annual_budget_categories")
        .update({ amount: value, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    : await supabase.from("annual_budget_categories").insert({
        owner_id: user.id,
        estate_id: estateId,
        budget_year: year,
        category,
        amount: value,
      });

  if (result.error) throw new Error(result.error.message);
  revalidatePath("/anggaran");
  redirect("/anggaran?status=saved");
}

export async function saveBlockBudget(formData: FormData) {
  const { supabase, user } = await session();
  const estateId = required(formData, "estate_id", "Kebun");
  const blockId = required(formData, "block_id", "Blok");
  const year = Number(required(formData, "budget_year", "Tahun"));
  const category = required(formData, "category", "Kategori");
  const value = amount(formData, "amount");

  const { data: existing } = await supabase
    .from("annual_block_budgets")
    .select("id")
    .eq("estate_id", estateId)
    .eq("block_id", blockId)
    .eq("budget_year", year)
    .eq("category", category)
    .maybeSingle();

  const result = existing
    ? await supabase
        .from("annual_block_budgets")
        .update({ amount: value, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    : await supabase.from("annual_block_budgets").insert({
        owner_id: user.id,
        estate_id: estateId,
        block_id: blockId,
        budget_year: year,
        category,
        amount: value,
      });

  if (result.error) throw new Error(result.error.message);
  revalidatePath("/anggaran");
  redirect("/anggaran?status=saved");
}
