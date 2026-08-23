"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AppIcon } from "./app-icons";

const quick = [
 ["/panen","harvest","Panen","Catat hasil panen"], ["/aktivitas","activity","Aktivitas","Operasional kebun"],
 ["/pupuk","fertilizer","Pupuk","Program & realisasi"], ["/tenaga-kerja","workforce","Tenaga Kerja","HOK & pelaksana"],
 ["/laporan","report","Laporan","Ringkasan kinerja"], ["/analytics","analytics","Analytics","Analisis kebun"],
 ["/anggaran","budget","Anggaran","Budget & kontrol biaya"]
] as const;

export function MobileNavigation({ role }: { role: string }){
 const [open,setOpen]=useState(false);
 const pathname=usePathname();
 const active=(href:string)=>href==="/"?pathname==="/":pathname===href||pathname.startsWith(`${href}/`);
 if(role==="pemanen") return <nav className="mobileBottomNav pemanenBottomNav" aria-label="Navigasi Pemanen"><Link href="/panen" className="active" aria-current="page"><AppIcon name="harvest"/><span>Catat Panen</span></Link><span className="pemanenNavNote">Mode lapangan · akses terbatas</span></nav>;
 return <>
  {open&&<div className="quickMenuBackdrop" onClick={()=>setOpen(false)} role="presentation"><section className="quickMenuSheet" onClick={e=>e.stopPropagation()} aria-label="Akses cepat"><div className="quickMenuHandle"/><header><div><small>AKSI CEPAT</small><h2>Akses Cepat</h2><p>Catat pekerjaan atau buka informasi utama kebun.</p></div><button type="button" onClick={()=>setOpen(false)} aria-label="Tutup">×</button></header><div className="quickMenuGrid">{quick.map(([href,icon,label,sub])=><Link href={href} key={href} onClick={()=>setOpen(false)}><i><AppIcon name={icon}/></i><span><b>{label}</b><small>{sub}</small></span></Link>)}</div></section></div>}
  <nav className="mobileBottomNav" aria-label="Navigasi utama">
   <Link href="/" className={active("/")?"active":""} aria-current={active("/")?"page":undefined}><AppIcon name="home"/><span>Beranda</span></Link>
   <Link href="/kalender" className={active("/kalender")?"active":""} aria-current={active("/kalender")?"page":undefined}><AppIcon name="calendar"/><span>Kalender</span></Link>
   <button type="button" className="mobileFab" onClick={()=>setOpen(true)} aria-label="Buka akses cepat" aria-expanded={open}><AppIcon name="plus"/><span>Aksi</span></button>
   <Link href="/rencana" className={active("/rencana")?"active":""} aria-current={active("/rencana")?"page":undefined}><AppIcon name="plan"/><span>Rencana</span></Link>
   <Link href="/kebun" className={active("/kebun")?"active":""} aria-current={active("/kebun")?"page":undefined}><AppIcon name="estate"/><span>Kebun</span></Link>
  </nav>
 </>;
}
