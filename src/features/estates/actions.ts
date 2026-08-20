"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}
function num(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}
function intOrNull(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) ? value : null;
}

export async function createEstate(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const name = text(formData, "name");
  if (!name) throw new Error("Nama kebun wajib diisi.");
  const { error } = await supabase.from("estates").insert({
    owner_id: user.id, name, area: 0, trees: 0, prod: 0, revenue: 0, cost: 0,
    latitude: text(formData, "latitude") ? num(formData, "latitude") : null,
    longitude: text(formData, "longitude") ? num(formData, "longitude") : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/"); revalidatePath("/kebun");
}

export async function updateEstate(estateId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const name = text(formData, "name");
  if (!name) throw new Error("Nama kebun wajib diisi.");

  const { data, error } = await supabase.from("estates").update({
    name,
    latitude: text(formData, "latitude") ? num(formData, "latitude") : null,
    longitude: text(formData, "longitude") ? num(formData, "longitude") : null,
  }).eq("id", estateId).select("id").single();

  if (error || !data) {
    throw new Error(`Perubahan kebun gagal disimpan: ${error?.message ?? "record tidak ter-update"}`);
  }

  revalidatePath("/");
  revalidatePath("/kebun");
  revalidatePath(`/kebun/${estateId}`);
  redirect(`/kebun/${estateId}?status=updated`);
}

export async function createBlock(estateId: string, formData: FormData) {
  const supabase = await createClient();
  const name = text(formData, "name");
  if (!name) throw new Error("Nama blok wajib diisi.");
  const { error } = await supabase.from("blocks").insert({
    estate_id: estateId, name,
    area: num(formData, "area"), trees: Math.max(0, Math.trunc(num(formData, "trees"))),
    planting_year: intOrNull(formData, "planting_year"), planting_date: text(formData, "planting_date"),
    variety: text(formData, "variety"), soil_type: text(formData, "soil_type") ?? "mineral",
    fertilizer_pattern: text(formData, "fertilizer_pattern") ?? "tunggal", status: "Aktif",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/"); revalidatePath("/kebun"); revalidatePath(`/kebun/${estateId}`);
}

export async function updateBlock(estateId: string, blockId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const name = text(formData, "name");
  if (!name) throw new Error("Nama blok wajib diisi.");

  const { data, error } = await supabase.from("blocks").update({
    name,
    area: num(formData, "area"),
    trees: Math.max(0, Math.trunc(num(formData, "trees"))),
    planting_year: intOrNull(formData, "planting_year"),
    planting_date: text(formData, "planting_date"),
    variety: text(formData, "variety"),
    soil_type: text(formData, "soil_type") ?? "mineral",
    fertilizer_pattern: text(formData, "fertilizer_pattern") ?? "tunggal",
    status: text(formData, "status") ?? "Aktif",
  }).eq("id", blockId).eq("estate_id", estateId).select("id").single();

  if (error || !data) {
    throw new Error(`Perubahan blok gagal disimpan: ${error?.message ?? "record tidak ter-update"}`);
  }

  revalidatePath("/");
  revalidatePath("/kebun");
  revalidatePath(`/kebun/${estateId}`);
  revalidatePath(`/kebun/${estateId}/blok/${blockId}`);
  redirect(`/kebun/${estateId}/blok/${blockId}?status=updated`);
}

export async function deleteBlock(estateId: string, blockId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("blocks").delete().eq("id", blockId).eq("estate_id", estateId);
  if (error) throw new Error(`Blok belum dapat dihapus: ${error.message}`);
  revalidatePath("/"); revalidatePath("/kebun"); revalidatePath(`/kebun/${estateId}`);
  redirect(`/kebun/${estateId}`);
}
