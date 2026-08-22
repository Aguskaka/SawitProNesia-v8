import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/(auth)/login/actions";
import { AppIcon } from "./app-icons";
import { MobileNavigation } from "./mobile-navigation";

const nav = [
  ["/", "home", "Beranda"], ["/kebun", "estate", "Kebun"], ["/aktivitas", "activity", "Aktivitas"],
  ["/pupuk", "fertilizer", "Pupuk"], ["/tenaga-kerja", "workforce", "Tenaga Kerja"], ["/panen", "harvest", "Panen"],
  ["/rencana", "plan", "Rencana"], ["/kalender", "calendar", "Kalender"], ["/anggaran", "budget", "Anggaran"],
  ["/laporan", "report", "Laporan"], ["/analytics", "analytics", "Analytics"],
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  return <div className="appShell premiumShell">
    <aside className="sideRail">
      <Link className="sideBrand" href="/"><span>🌴</span><div><b>SawitProNesia</b><small>Manajemen Kebun Sawit</small></div></Link>
      <nav className="sideNav">{nav.map(([href,icon,label])=><Link key={href} href={href}><i><AppIcon name={icon}/></i><span>{label}</span></Link>)}</nav>
      <div className="sideFoot"><small>SAWIT OPERATIONS OS</small><b>v9.5</b></div>
    </aside>
    <div className="shellBody">
      <header className="mobileTopbar"><Link className="mobileBrand" href="/"><span>🌴</span><b>SawitProNesia</b></Link><div><span className="versionPill">v9.5</span><form action={logout}><button className="mobileAccount" type="submit" title="Keluar"><AppIcon name="user"/></button></form></div></header>
      <main className="content premiumContent">{children}</main>
      <MobileNavigation/>
    </div>
  </div>;
}
