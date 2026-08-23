"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function RoleRouteGuard({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (role === "pemanen" && !pathname.startsWith("/panen")) {
      router.replace("/panen");
    }
  }, [pathname, role, router]);

  if (role === "pemanen" && !pathname.startsWith("/panen")) {
    return <div className="roleRedirectShield"><b>Membuka Mode Pemanen…</b><span>Akses Anda difokuskan ke pencatatan hasil panen.</span></div>;
  }
  return null;
}
