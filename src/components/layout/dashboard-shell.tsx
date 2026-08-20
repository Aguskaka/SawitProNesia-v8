import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/(auth)/login/actions";

const nav = [
  ["/", "⌂", "Beranda"], ["/kebun", "♧", "Kebun"], ["/aktivitas", "↗", "Aktivitas"],
  ["/pupuk", "♨", "Pupuk"], ["/tenaga-kerja", "♙", "Tenaga Kerja"], ["/panen", "◉", "Panen"],
  ["/rencana", "▣", "Rencana"], ["/kalender", "□", "Kalender"], ["/anggaran", "◈", "Anggaran"],
  ["/laporan", "▤", "Laporan"], ["/analytics", "⌁", "Analytics"],
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  return <div className="appShell premiumShell">
    <aside className="sideRail">
      <Link className="sideBrand" href="/"><span>🌴</span><div><b>SawitProNesia</b><small>Manajemen Kebun Sawit</small></div></Link>
      <nav className="sideNav">{nav.map(([href,icon,label])=><Link key={href} href={href}><i>{icon}</i><span>{label}</span></Link>)}</nav>
      <div className="sideFoot"><small>PREMIUM MOBILE-FIRST</small><b>v9.2</b></div>
    </aside>
    <div className="shellBody">
      <header className="mobileTopbar"><Link className="mobileBrand" href="/"><span>🌴</span><b>SawitProNesia</b></Link><div><span className="versionPill">v9.2</span><form action={logout}><button className="mobileAccount" type="submit" title="Keluar">♙</button></form></div></header>
      <main className="content premiumContent">{children}</main>
      <nav className="mobileBottomNav">
        <Link href="/"><i>⌂</i><span>Beranda</span></Link><Link href="/kalender"><i>□</i><span>Kalender</span></Link><Link className="mobileFab" href="/aktivitas"><i>＋</i></Link><Link href="/rencana"><i>▣</i><span>Rencana</span></Link><Link href="/kebun"><i>♧</i><span>Kebun</span></Link>
      </nav>
    </div>
  </div>;
}
