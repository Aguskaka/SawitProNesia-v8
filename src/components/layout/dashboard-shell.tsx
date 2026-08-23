import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/(auth)/login/actions";
import { AppIcon } from "./app-icons";
import { MobileNavigation } from "./mobile-navigation";
import { SideNavigation } from "./side-navigation";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";

function BrandMark() {
  return <span className="appBrandMark" aria-hidden="true"><AppIcon name="estate" /></span>;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return <div className="appShell premiumShell">
    <aside className="sideRail">
      <Link className="sideBrand" href="/"><BrandMark/><div><b>SawitProNesia</b><small>Manajemen Kebun Sawit</small></div></Link>
      <SideNavigation />
      <div className="sideFoot"><small>SAWIT OPERATIONS OS</small><b>v10.6.2</b><PwaInstallButton /></div>
    </aside>
    <div className="shellBody">
      <header className="mobileTopbar">
        <Link className="mobileBrand" href="/"><BrandMark/><b>SawitProNesia</b></Link>
        <div><PwaInstallButton compact /><span className="versionPill">v10.6.2</span><form action={logout}><button className="mobileAccount" type="submit" title="Keluar" aria-label="Keluar dari SawitProNesia"><AppIcon name="user"/></button></form></div>
      </header>
      <main className="content premiumContent" id="main-content">{children}</main>
      <MobileNavigation/>
    </div>
  </div>;
}
