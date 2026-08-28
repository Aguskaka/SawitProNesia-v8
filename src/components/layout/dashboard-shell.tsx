import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/(auth)/login/actions";
import { AppIcon } from "./app-icons";
import { MobileNavigation } from "./mobile-navigation";
import { SideNavigation } from "./side-navigation";
import { RoleRouteGuard } from "./role-route-guard";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";

function BrandMark() {
  return <span className="appBrandMark" aria-hidden="true"><AppIcon name="estate" /></span>;
}

function roleLabel(role: string) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "mandor") return "Mandor";
  if (role === "pemanen") return "Pemanen";
  return "Viewer";
}

export function DashboardShell({ children, role, email }: { children: ReactNode; role: string; email?: string | null }) {
  const pemanen = role === "pemanen";
  return <div className={`appShell premiumShell ${pemanen ? "pemanenShell" : ""}`}>
    <RoleRouteGuard role={role} />
    <aside className="sideRail">
      <Link className="sideBrand" href={pemanen ? "/panen" : "/"}><BrandMark/><div><b>SawitProNesia</b><small>{pemanen ? "Mode Pemanen" : "Manajemen Kebun Sawit"}</small></div></Link>
      <SideNavigation role={role} />
      <div className="sideFoot"><small>{pemanen ? "FIELD HARVEST MODE" : "SAWIT OPERATIONS OS"}</small><b>v11.1.3</b>{!pemanen ? <PwaInstallButton /> : null}<form action={logout}><button className="sideLogout" type="submit">Keluar</button></form></div>
    </aside>
    <div className="shellBody">
      <header className="mobileTopbar">
        <Link className="mobileBrand" href={pemanen ? "/panen" : "/"}><BrandMark/><b>SawitProNesia</b></Link>
        <div className="topbarActions">{!pemanen ? <PwaInstallButton compact /> : <span className="rolePill">PEMANEN</span>}<span className="versionPill">v11.1.3</span><details className="accountMenu"><summary className="mobileAccount" title="Profil" aria-label="Buka menu profil"><AppIcon name="user"/></summary><div className="accountMenuPanel"><div className="accountMenuHead"><span className="accountAvatar"><AppIcon name="user"/></span><div><b>{email || "Akun SawitProNesia"}</b><small>{roleLabel(role)}</small></div></div><div className="accountMenuMeta"><span>Role</span><b>{roleLabel(role)}</b></div>{role === "owner" ? <Link className="accountMenuLink" href="/akses"><AppIcon name="user"/><span><b>Akses Pengguna</b><small>Kelola role & kebun tugas</small></span></Link> : null}<div className="accountMenuVersion"><span>Versi aplikasi</span><b>v11.1.3</b></div><form action={logout}><button className="accountLogout" type="submit">Keluar</button></form></div></details></div>
      </header>
      <main className="content premiumContent" id="main-content">{children}</main>
      <MobileNavigation role={role}/>
    </div>
  </div>;
}
