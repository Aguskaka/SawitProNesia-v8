"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon } from "./app-icons";

const nav = [
  ["/", "home", "Beranda"], ["/kebun", "estate", "Kebun"], ["/aktivitas", "activity", "Aktivitas"],
  ["/pupuk", "fertilizer", "Pupuk"], ["/tenaga-kerja", "workforce", "Tenaga Kerja"], ["/panen", "harvest", "Panen"],
  ["/rencana", "plan", "Rencana"], ["/kalender", "calendar", "Kalender"], ["/anggaran", "budget", "Anggaran"],
  ["/laporan", "report", "Laporan"], ["/analytics", "analytics", "Analytics"],
] as const;

export function SideNavigation({ role }: { role: string }) {
  const pathname = usePathname();
  const active = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const items = role === "pemanen" ? [["/panen", "harvest", "Catat Panen"]] as const : nav;

  return (
    <nav className="sideNav" aria-label="Navigasi utama">
      {items.map(([href, icon, label]) => (
        <Link key={href} href={href} className={active(href) ? "active" : ""} aria-current={active(href) ? "page" : undefined}>
          <i><AppIcon name={icon} /></i><span>{label}</span>
        </Link>
      ))}
      {role === "owner" ? <Link href="/akses" className={active("/akses") ? "active" : ""}><i><AppIcon name="user" /></i><span>Akses Pengguna</span></Link> : null}
    </nav>
  );
}
