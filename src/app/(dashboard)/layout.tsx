export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccess } from "@/lib/auth/access";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await getCurrentAccess();
  return <DashboardShell role={access?.role ?? "viewer"} email={user.email}>{children}</DashboardShell>;
}
