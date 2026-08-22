export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppIcon } from "@/components/layout/app-icons";
import { fertilizerProgramProgress } from "@/lib/calculations/fertilizer";
import { formatCompactRupiah, formatNumber } from "@/lib/formatters";
import { deleteFertilizerProgram, executeFertilizerProgram } from "@/features/fertilizer/actions";

function idDate(value: string) {
  return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(`${value}T00:00:00`));
}

export default async function FertilizerProgramDetail({
  params, searchParams,
}: {
  params: Promise<{programId:string}>;
  searchParams: Promise<{status?:string}>;
}) {
  const {programId}=await params; const query=await searchParams; const supabase=await createClient();
  const {data:program,error}=await supabase.from("fertilizer_programs").select("*").eq("id",programId).single();
  if(error||!program)notFound();

  const [er,br,ir,xr,xir]=await Promise.all([
    supabase.from("estates").select("id,name").eq("id",program.estate_id).single(),
    supabase.from("blocks").select("id,name,trees,planting_year,planting_date,soil_type,fertilizer_pattern").eq("id",program.block_id).single(),
    supabase.from("fertilizer_program_items").select("*").eq("program_id",program.id).order("sort_order"),
    supabase.from("fertilizer_executions").select("*").eq("program_id",program.id).order("execution_date",{ascending:false}),
    supabase.from("fertilizer_execution_items").select("*"),
  ]);
  if(er.error||!er.data||br.error||!br.data)notFound(); if(ir.error||xr.error||xir.error)throw new Error(ir.error?.message||xr.error?.message||xir.error?.message||"Data error");
  const estate=er.data,block=br.data,items=ir.data??[],execs=xr.data??[];
  const ids=execs.map(x=>x.id),execItems=(xir.data??[]).filter(x=>ids.includes(x.execution_id));
  const progress=fertilizerProgramProgress(items,execItems);
  const est=items.reduce((s,x)=>s+Number(x.estimated_cost??0),0),actual=execItems.reduce((s,x)=>s+Number(x.actual_cost??0),0);
  const costVariance=actual-est;
  const action=executeFertilizerProgram.bind(null,program.id),del=deleteFertilizerProgram.bind(null,program.id);

  return <div className="planDetailPage v97FertDetailPage">
    <Link className="backLink" href="/pupuk">← Kembali ke Pupuk & Pemupukan</Link>
    {query.status?<div className="activityNotice">{query.status==="executed"?"Realisasi pupuk berhasil disimpan.":"Program pupuk berhasil dibuat."}</div>:null}

    <section className="v97DetailHero">
      <div className="v97DetailHeroMain"><span>FERTILIZER PROGRAM</span><h1>{block.name} · {program.period_label||program.pattern}</h1><p>{estate.name} · {idDate(program.planned_date)} · {block.trees ?? 0} pohon</p><div className="v97DetailTags"><b>{program.pattern || "Program"}</b><b>{program.planning_mode || "manual"}</b><b>{program.recommendation_source || "Sumber manual"}</b></div></div>
      <div className="v97ProgressRing" style={{"--progress":`${Math.min(progress.percentage,100)*3.6}deg`} as CSSProperties}><div><strong>{formatNumber(Math.min(progress.percentage,100),0)}%</strong><small>{progress.status}</small></div></div>
    </section>

    <section className="v97DetailKpis">
      <article><i><AppIcon name="plan"/></i><div><small>KEBUTUHAN</small><strong>{formatNumber(progress.plannedKg)} Kg</strong><span>{items.length} jenis pupuk</span></div></article>
      <article><i><AppIcon name="fertilizer"/></i><div><small>REALISASI</small><strong>{formatNumber(progress.actualKg)} Kg</strong><span>{execs.length} kali aplikasi</span></div></article>
      <article><i><AppIcon name="activity"/></i><div><small>SISA</small><strong>{formatNumber(progress.remainingKg)} Kg</strong><span>{progress.status === "Selesai" ? "program terpenuhi" : "masih perlu aplikasi"}</span></div></article>
      <article><i><AppIcon name="budget"/></i><div><small>BIAYA AKTUAL</small><strong>{formatCompactRupiah(actual)}</strong><span>{costVariance<=0 ? `${formatCompactRupiah(Math.abs(costVariance))} di bawah estimasi` : `${formatCompactRupiah(costVariance)} di atas estimasi`}</span></div></article>
    </section>

    <section className="v97DosePanel">
      <div className="v97SectionHead"><i><AppIcon name="fertilizer"/></i><div><span>ITEM PROGRAM</span><h2>Rencana Dosis & Material</h2><p>Bandingkan kebutuhan per jenis pupuk dengan jumlah yang sudah diaplikasikan.</p></div></div>
      <div className="v97DoseTable">
        <div className="v97DoseHeader"><span>Pupuk</span><span>Dosis</span><span>Rencana</span><span>Actual</span><span>Progress</span><span>Estimasi</span></div>
        {items.map(item=>{
          const actualQty=execItems.filter(x=>x.program_item_id===item.id).reduce((s,x)=>s+Number(x.actual_quantity_kg??0),0);
          const requirement=Number(item.requirement_kg??0); const itemPct=requirement>0?Math.min(actualQty/requirement*100,100):0;
          return <div className="v97DoseRow" key={item.id}>
            <div><span className="v97FertMiniIcon"><AppIcon name="fertilizer"/></span><b>{item.fertilizer_name}</b></div>
            <span>{Number(item.custom_dose)>0?item.custom_dose:item.standard_dose} {item.dose_unit}</span>
            <strong>{formatNumber(requirement)} Kg</strong><strong>{formatNumber(actualQty)} Kg</strong>
            <div className="v97ItemProgress"><i><b style={{width:`${itemPct}%`}}/></i><small>{formatNumber(itemPct,0)}%</small></div>
            <strong>{formatCompactRupiah(Number(item.estimated_cost))}</strong>
          </div>;
        })}
      </div>
    </section>

    {progress.status!=="Selesai"?<section className="v97ExecutionPanel">
      <div className="v97SectionHead"><i><AppIcon name="plus"/></i><div><span>REALISASI LAPANGAN</span><h2>Catat Pemupukan</h2><p>Isi hanya material yang benar-benar diaplikasikan pada tanggal tersebut. Data ini otomatis masuk ke Aktivitas.</p></div></div>
      <form action={action} className="masterForm fertExecuteForm v97ExecuteForm"><label>Tanggal Realisasi<input name="execution_date" type="date" defaultValue={program.planned_date} required/></label><label>Pelaksana<input name="worker" placeholder="Nama mandor / pekerja"/></label>
      <div className="v97ExecutionHead fullField"><span>Jenis Pupuk</span><span>Actual Kg</span><span>Harga/Kg</span><span>Dosis/Pohon</span></div>
      {items.map(item=><div className="fertExecutionRow v97ExecutionRow fullField" key={item.id}><b>{item.fertilizer_name}<small>Sisa {formatNumber(Math.max(0,Number(item.requirement_kg??0)-execItems.filter(x=>x.program_item_id===item.id).reduce((s,x)=>s+Number(x.actual_quantity_kg??0),0)))} Kg</small></b><input name={`qty_${item.id}`} type="number" min="0" step="0.01" placeholder="0"/><input name={`price_${item.id}`} type="number" min="0" step="1" defaultValue={Number(item.unit_price??0)} placeholder="Harga/Kg"/><input name={`dose_${item.id}`} type="number" min="0" step="0.001" placeholder="Dosis aktual"/></div>)}
      <label className="fullField">Catatan<textarea name="note" rows={3} placeholder="Kondisi lapangan, cuaca, atau catatan aplikasi..."/></label><button className="primaryButton fullField v97ExecuteButton" type="submit">Simpan Realisasi Pupuk</button></form>
    </section>:<section className="v97CompleteBanner"><AppIcon name="fertilizer"/><div><b>Program pemupukan selesai</b><span>Realisasi material telah memenuhi kebutuhan program.</span></div><strong>{formatNumber(progress.actualKg)} Kg</strong></section>}

    <section className="planActualSection v97HistoryPanel"><div className="v97SectionHead"><i><AppIcon name="activity"/></i><div><span>EXECUTION HISTORY</span><h2>Histori Realisasi</h2><p>Jejak setiap aplikasi material untuk program ini.</p></div></div>
      <div className="v97ExecutionHistory">{execs.map(ex=>{
        const executionRows=execItems.filter(x=>x.execution_id===ex.id); const qty=executionRows.reduce((s,x)=>s+Number(x.actual_quantity_kg??0),0); const cost=executionRows.reduce((s,x)=>s+Number(x.actual_cost??0),0);
        return <div className="v97HistoryRow" key={ex.id}><span className="v97HistoryIcon"><AppIcon name="fertilizer"/></span><div><b>{idDate(ex.execution_date)}</b><small>{ex.worker||"Pelaksana belum diisi"}</small><div>{executionRows.map(row=>{const item=items.find(i=>i.id===row.program_item_id);return <span key={row.id}>{item?.fertilizer_name ?? "Pupuk"} · {formatNumber(Number(row.actual_quantity_kg??0))} Kg</span>})}</div></div><section><strong>{formatNumber(qty)} Kg</strong><small>{formatCompactRupiah(cost)}</small></section></div>
      })}{!execs.length?<div className="v97EmptyHistory"><AppIcon name="activity"/><b>Belum ada realisasi</b><span>Catat aplikasi pertama menggunakan form di atas.</span></div>:null}</div>
    </section>

    <section className="dangerPanel v97DangerPanel"><div><b>Hapus Program Pupuk</b><p>Program hanya dapat dihapus sebelum memiliki realisasi.</p></div><form action={del}><button className="dangerButton" type="submit" disabled={execs.length>0}>Hapus Program</button></form></section>
  </div>;
}
