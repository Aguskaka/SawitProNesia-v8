"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=Email%20dan%20password%20wajib%20diisi");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=Email%20atau%20password%20tidak%20valid");
  }

  // Important for SSR behind Cloudflare:
  // make the first authenticated render use the newly-written auth cookies,
  // not a previously cached anonymous layout.
  revalidatePath("/", "layout");
  const { data: accessRows } = await supabase.rpc("spn_current_access");
  const access = Array.isArray(accessRows) ? accessRows[0] : null;
  redirect(access?.role === "pemanen" ? "/panen" : "/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
