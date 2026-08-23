"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccess } from "@/lib/auth/access";

export async function assignMemberAccess(formData: FormData) {
  const access = await getCurrentAccess();
  if (!access || access.role !== "owner") throw new Error("Hanya Owner yang dapat mengelola akses pengguna.");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "pemanen").trim();
  const estateId = String(formData.get("estate_id") ?? "").trim() || null;

  if (!email) throw new Error("Email pengguna wajib diisi.");
  if (!["admin", "mandor", "pemanen", "viewer"].includes(role)) throw new Error("Role tidak valid.");
  if (role === "pemanen" && !estateId) throw new Error("Pemanen wajib ditugaskan ke satu kebun.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("spn_assign_member_by_email", {
    p_email: email,
    p_role: role,
    p_estate_id: estateId,
  });
  if (error) throw new Error(`Gagal mengatur akses: ${error.message}`);

  revalidatePath("/akses");
  redirect("/akses?status=saved");
}

export async function revokeMemberAccess(formData: FormData) {
  const access = await getCurrentAccess();
  if (!access || access.role !== "owner") throw new Error("Hanya Owner yang dapat mencabut akses pengguna.");

  const memberId = String(formData.get("member_id") ?? "").trim();
  if (!memberId) throw new Error("ID anggota tidak valid.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("spn_revoke_member_access", { p_member_id: memberId });
  if (error) throw new Error(`Gagal mencabut akses: ${error.message}`);

  revalidatePath("/akses");
  redirect("/akses?status=revoked");
}
