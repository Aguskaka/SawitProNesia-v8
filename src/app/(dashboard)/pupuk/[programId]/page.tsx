export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    supabase.from("blocks").select("id,name,trees").eq("id",program.block_id).single(),
    supabase.from("fertilizer_program_items").select("*").eq("program_id",program.id).order("sort_order"),
    supabase.from("fertilizer_executions").select("*").eq("program_id",program.id).order("execution_date"),
    supabase.from("fertilizer_execution_items").select("*"),
  ]);
  if(er.error||!er.data||br.error||!br.data)notFound(); if(ir.error||xr.error||xir.error)throw new Error(ir.error?.message||xr.error?.message||xir.error?.message||"Data error");
  const estate=er.data,block=br.data,items=ir.data??[],execs=xr.data??[];
  const ids=execs.map(x=>x.id),execItems=(xir.data??[]).filter(x=>ids.includes(x.execution_id));
  const progress=fertilizerProgramProgress(items,execItems);
  const est=items.reduce((s,x)=>s+Number(x.estimated_cost??0),0),actual=execItems.reduce((s,x)=>s+Number(x.actual_cost??0),0);
  const action=executeFertilizerProgram.bind(null,program.id),del=deleteFertilizerProgram.bind(null,program.id);

  return <div className="planDetailPage">
    <Link className="backLink" href="/pupuk">← Kembali ke Program Pupuk</Link>
    {query.status?<div className="activityNotice">{query.status==="executed"?"Realisasi pupuk berhasil disimpan.":"Program pupuk berhasil dibuat."}</div>:null}
    <section className="planDetailHero"><div><span>FERTILIZER PROGRAM</span><h1>{block.name} · {program.period_label||program.pattern}</h1><p>{estate.name} · {idDate(program.planned_date)} · {block.trees} pohon</p></div><div className="detailSource"><b className={`planStatus ${progress.status.toLowerCase()}`}>{progress.status}</b><strong>{formatNumber(progress.percentage,1)}%</strong></div></section>
    <section className="planInfoGrid"><article><small>Kebutuhan</small><strong>{formatNumber(progress.plannedKg)} Kg</strong></article><article><small>Actual</small><strong>{formatNumber(progress.actualKg)} Kg</strong></article><article><small>Sisa</small><strong>{formatNumber(progress.remainingKg)} Kg</strong></article><article><small>Biaya Actual</small><strong>{formatCompactRupiah(actual)}</strong></article></section>

    <section className="editPanel"><div className="activitySectionTitle"><span>ITEM PROGRAM</span><h2>Rencana Dosis & Biaya</h2></div>
      <div className="fertDetailItems">{items.map(item=>{
        const actualQty=execItems.filter(x=>x.program_item_id===item.id).reduce((s,x)=>s+Number(x.actual_quantity_kg??0),0);
        return <div className="fertDetailItem" key={item.id}><div><b>{item.fertilizer_name}</b><small>Dosis {Number(item.custom_dose)>0?item.custom_dose:item.standard_dose} {item.dose_unit}</small></div><div><span>Rencana</span><strong>{formatNumber(Number(item.requirement_kg))} Kg</strong></div><div><span>Actual</span><strong>{formatNumber(actualQty)} Kg</strong></div><div><span>Estimasi</span><strong>{formatCompactRupiah(Number(item.estimated_cost))}</strong></div></div>;
      })}</div>
    </section>

    {progress.status!=="Selesai"?<section className="editPanel"><div className="activitySectionTitle"><span>＋ REALISASI</span><h2>Catat Pemupukan</h2></div>
      <form action={action} className="masterForm fertExecuteForm"><label>Tanggal<input name="execution_date" type="date" defaultValue={program.planned_date} required/></label><label>Pelaksana<input name="worker"/></label>
      {items.map(item=><div className="fertExecutionRow fullField" key={item.id}><b>{item.fertilizer_name}</b><input name={`qty_${item.id}`} type="number" min="0" step="0.01" placeholder="Actual Kg"/><input name={`price_${item.id}`} type="number" min="0" step="1" defaultValue={Number(item.unit_price??0)} placeholder="Harga/Kg"/><input name={`dose_${item.id}`} type="number" min="0" step="0.001" placeholder="Dosis actual/pohon"/></div>)}
      <label className="fullField">Catatan<textarea name="note" rows={3}/></label><button className="primaryButton fullField" type="submit">Simpan Realisasi Pupuk</button></form>
    </section>:null}

    <section className="planActualSection"><div className="activitySectionTitle"><span>EXECUTION HISTORY</span><h2>Histori Realisasi</h2></div><div className="planActualList">{execs.map(ex=><div className="planActualRow" key={ex.id}><span>🧺</span><div><b>{idDate(ex.execution_date)}</b><small>{ex.worker||"Pelaksana belum diisi"}</small></div><strong>{execItems.filter(x=>x.execution_id===ex.id).reduce((s,x)=>s+Number(x.actual_quantity_kg??0),0).toLocaleString("id-ID")} Kg</strong></div>)}{!execs.length?<div className="emptyActivity">Belum ada realisasi.</div>:null}</div></section>
    <section className="dangerPanel"><div><b>Hapus Program Pupuk</b><p>Hanya dapat dihapus sebelum memiliki realisasi.</p></div><form action={del}><button className="dangerButton" type="submit" disabled={execs.length>0}>Hapus Program</button></form></section>
  </div>;
}
