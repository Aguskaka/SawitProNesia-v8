import { createClient } from "@/lib/supabase/server";

export type AppRole = "owner" | "admin" | "mandor" | "pemanen" | "viewer";

export type CurrentAccess = {
  userId: string;
  email: string | null;
  role: AppRole;
  estateId: string | null;
};

const roleSet = new Set<AppRole>(["owner", "admin", "mandor", "pemanen", "viewer"]);

export function isPemanen(access: Pick<CurrentAccess, "role">) {
  return access.role === "pemanen";
}

export function canManageAccess(access: Pick<CurrentAccess, "role">) {
  return access.role === "owner";
}

export function canEditHarvest(access: Pick<CurrentAccess, "role">) {
  return ["owner", "admin", "mandor"].includes(access.role);
}

export function canDeleteHarvest(access: Pick<CurrentAccess, "role">) {
  return ["owner", "admin"].includes(access.role);
}

export async function getCurrentAccess(): Promise<CurrentAccess | null> {
  const supabase = await createClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const user = userResult.user;
  if (userError || !user) return null;

  // v10.7 uses a SECURITY DEFINER RPC so membership can be read without
  // recursive workspace_members RLS evaluation. Fallback keeps existing owners
  // working while the SQL patch is being applied.
  const { data: rpcRows, error: rpcError } = await supabase.rpc("spn_current_access");
  const rpcRow = Array.isArray(rpcRows) ? rpcRows[0] : null;
  if (!rpcError && rpcRow && roleSet.has(rpcRow.role as AppRole)) {
    return {
      userId: user.id,
      email: user.email ?? null,
      role: rpcRow.role as AppRole,
      estateId: rpcRow.estate_id ?? null,
    };
  }

  const { data: ownedEstate } = await supabase
    .from("estates")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (ownedEstate) {
    return { userId: user.id, email: user.email ?? null, role: "owner", estateId: null };
  }

  return { userId: user.id, email: user.email ?? null, role: "viewer", estateId: null };
}

export async function assertHarvestCreateAccess(estateId: string) {
  const access = await getCurrentAccess();
  if (!access) throw new Error("Sesi login tidak valid.");
  if (!["owner", "admin", "mandor", "pemanen"].includes(access.role)) {
    throw new Error("Role Anda tidak memiliki akses untuk mencatat panen.");
  }
  if (access.role === "pemanen" && (!access.estateId || access.estateId !== estateId)) {
    throw new Error("Pemanen hanya dapat mencatat panen pada kebun yang ditugaskan.");
  }
  return access;
}

export async function assertHarvestEditAccess() {
  const access = await getCurrentAccess();
  if (!access || !canEditHarvest(access)) {
    throw new Error("Role Anda tidak memiliki akses untuk mengubah transaksi panen.");
  }
  return access;
}

export async function assertHarvestDeleteAccess() {
  const access = await getCurrentAccess();
  if (!access || !canDeleteHarvest(access)) {
    throw new Error("Hanya Owner/Admin yang dapat menghapus transaksi panen.");
  }
  return access;
}
