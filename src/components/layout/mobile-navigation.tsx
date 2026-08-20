"use client";
import Link from "next/link";
import { useState } from "react";
import { AppIcon } from "./app-icons";

const quick = [
 ["/panen","harvest","Panen","Catat hasil panen"], ["/aktivitas","activity","Aktivitas","Operasional kebun"],
 ["/pupuk","fertilizer","Pupuk","Program & realisasi"], ["/tenaga-kerja","workforce","Tenaga Kerja","HOK & pelaksana"],
 ["/laporan","report","Laporan","Ringkasan kinerja"], ["/analytics","analytics","Analytics","Analisis kebun"],
 ["/anggaran","budget","Anggaran","Budget & kontrol biaya"]
] as const;
export function MobileNavigation(){const [open,setOpen]=useState(false);return <>
 {open&&<div className="quickMenuBackdrop" onClick={()=>setOpen(false)}><section className="quickMenuSheet" onClick={e=>e.stopPropagation()}><div className="quickMenuHandle"/><header><div><small>QUICK MENU</small><h2>Akses Cepat</h2><p>Input operasional dan informasi utama kebun.</p></div><button onClick={()=>setOpen(false)} aria-label="Tutup">×</button></header><div className="quickMenuGrid">{quick.map(([href,icon,label,sub])=><Link href={href} key={href} onClick={()=>setOpen(false)}><i><AppIcon name={icon}/></i><span><b>{label}</b><small>{sub}</small></span></Link>)}</div></section></div>}
 <nav className="mobileBottomNav"><Link href="/"><AppIcon name="home"/><span>Beranda</span></Link><Link href="/kalender"><AppIcon name="calendar"/><span>Kalender</span></Link><button className="mobileFab" onClick={()=>setOpen(true)} aria-label="Buka akses cepat"><AppIcon name="plus"/></button><Link href="/rencana"><AppIcon name="plan"/><span>Rencana</span></Link><Link href="/kebun"><AppIcon name="estate"/><span>Kebun</span></Link></nav>
 </>}
