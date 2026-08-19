import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: estates, error } = await supabase
    .from("estates")
    .select("id,name")
    .order("created_at");

  if (error) {
    throw new Error(`Gagal membaca estates: ${error.message}`);
  }

  const context = await getAppContext();
  const safeEstates = estates ?? [];
  const activeEstateId =
    context.activeEstateId && safeEstates.some((estate) => estate.id === context.activeEstateId)
      ? context.activeEstateId
      : safeEstates[0]?.id ?? null;

  return (
    <DashboardShell
      estates={safeEstates}
      selectedYear={context.selectedYear}
      activeEstateId={activeEstateId}
    >
      {children}
    </DashboardShell>
  );
}
