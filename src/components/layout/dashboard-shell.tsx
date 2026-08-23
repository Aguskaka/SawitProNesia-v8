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

export function DashboardShell({ children, role }: { children: ReactNode; role: string }) {
  const pemanen = role === "pemanen";
  return <div className={`appShell premiumShell ${pemanen ? "pemanenShell" : ""}`}>
    <RoleRouteGuard role={role} />
    <aside className="sideRail">
      <Link className="sideBrand" href={pemanen ? "/panen" : "/"}><BrandMark/><div><b>SawitProNesia</b><small>{pemanen ? "Mode Pemanen" : "Manajemen Kebun Sawit"}</small></div></Link>
      <SideNavigation role={role} />
      <div className="sideFoot"><small>{pemanen ? "FIELD HARVEST MODE" : "SAWIT OPERATIONS OS"}</small><b>v11.0</b>{!pemanen ? <PwaInstallButton /> : null}<form action={logout}><button className="sideLogout" type="submit">Keluar</button></form></div>
    </aside>
    <div className="shellBody">
      <header className="mobileTopbar">
        <Link className="mobileBrand" href={pemanen ? "/panen" : "/"}><BrandMark/><b>SawitProNesia</b></Link>
        <div>{!pemanen ? <PwaInstallButton compact /> : <span className="rolePill">PEMANEN</span>}<span className="versionPill">v11.0</span><form action={logout}><button className="mobileAccount" type="submit" title="Keluar" aria-label="Keluar dari SawitProNesia"><AppIcon name="user"/></button></form></div>
      </header>
      <main className="content premiumContent" id="main-content">{children}</main>
      <MobileNavigation role={role}/>
    </div>
  </div>;
}
