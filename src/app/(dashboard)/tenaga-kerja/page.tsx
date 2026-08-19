export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { ContextSelector } from "@/components/layout/context-selector";
import { createLaborActual } from "@/features/workforce/actions";
import { formatCompactRupiah, formatNumber } from "@/lib/formatters";

export default async function WorkforcePage({searchParams}:{searchParams:Promise<{status?:string}>}) {
 const params=await searchParams,supabase=await createClient(),context=await getAppContext();
 const [er,br,or]=await Promise.all([supabase.from("estates").select("id,name").order("created_at"),supabase.from("blocks").select("id,estate_id,name").order("name"),supabase.from("operations").select("*").order("op_date",{ascending:false})]);
 for(const r of [er,br,or])if(r.error)throw new Error(r.error.message);
 const estates=er.data??[],blocks=br.data??[],ops=or.data??[],estateId=context.activeEstateId&&estates.some(e=>e.id===context.activeEstateId)?context.activeEstateId:estates[0]?.id??null,estate=estates.find(e=>e.id===estateId)??null,estateBlocks=blocks.filter(b=>b.estate_id===estateId);
 const rows=ops.filter(o=>o.estate_id===estateId&&String(o.op_date).startsWith(`${context.selectedYear}-`)&&(Number(o.labor_days??0)>0||o.type==="Tenaga Kerja"));
 const totalHok=rows.reduce((s,o)=>s+Number(o.labor_days??0),0),laborCost=rows.reduce((s,o)=>s+Number(o.labor_days??0)*Number(o.labor_rate??0),0);
 const workerMap=new Map<string,{hok:number,cost:number,count:number}>();
 for(const o of rows){const name=o.worker||"Belum diisi",x=workerMap.get(name)||{hok:0,cost:0,count:0};x.hok+=Number(o.labor_days??0);x.cost+=Number(o.labor_days??0)*Number(o.labor_rate??0);x.count++;workerMap.set(name,x)}
 const workerRows=[...workerMap.entries()].sort((a,b)=>b[1].hok-a[1].hok);
 return <div className="workforcePage"><section className="planningHeading"><div><span>WORKFORCE CONTROL</span><h1>Tenaga Kerja</h1><p>HOK dan biaya tenaga kerja dibaca langsung dari operations sehingga konsisten dengan Laporan.</p></div><ContextSelector estates={estates} selectedYear={context.selectedYear} activeEstateId={estateId}/></section>
 {params.status?<div className="activityNotice">Actual tenaga kerja berhasil disimpan.</div>:null}
 <section className="workforceKpis"><article><small>Total HOK</small><strong>{formatNumber(totalHok)}</strong><span>{rows.length} aktivitas</span></article><article><small>Biaya Tenaga Kerja</small><strong>{formatCompactRupiah(laborCost)}</strong><span>{context.selectedYear}</span></article><article><small>Pelaksana</small><strong>{workerRows.length}</strong><span>Nama unik</span></article><article><small>Rata-rata / HOK</small><strong>{formatCompactRupiah(totalHok>0?laborCost/totalHok:0)}</strong><span>Biaya ÷ HOK</span></article></section>
 <section className="workforceGrid"><article className="budgetPanel"><div className="activitySectionTitle"><span>＋ ACTUAL DIRECT</span><h2>Catat Tenaga Kerja</h2></div>{estate?<form action={createLaborActual} className="workforceForm"><input type="hidden" name="estate_id" value={estate.id}/><label>Blok<select name="block_id"><option value="">Umum Kebun</option>{estateBlocks.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select></label><label>Tanggal<input name="op_date" type="date" defaultValue={`${context.selectedYear}-08-19`} required/></label><label className="fullField">Uraian<input name="description" placeholder="Pruning / rawat jalan / angkut..." required/></label><label>HOK<input name="labor_days" type="number" min="0" step="0.01" required/></label><label>Upah/HOK<input name="labor_rate" type="number" min="0" step="1" required/></label><label className="fullField">Pelaksana<input name="worker"/></label><label className="fullField">Catatan<textarea name="note" rows={3}/></label><button className="primaryButton fullField">Simpan Tenaga Kerja</button></form>:null}</article>
 <article className="budgetPanel"><div className="activitySectionTitle"><span>WORKER SUMMARY</span><h2>Rekap Pelaksana</h2></div><div className="monthlyTableWrap"><table className="reportTable"><thead><tr><th>Pelaksana</th><th>Aktivitas</th><th>HOK</th><th>Biaya</th></tr></thead><tbody>{workerRows.map(([name,x])=><tr key={name}><td><b>{name}</b></td><td>{x.count}</td><td>{formatNumber(x.hok)}</td><td>{formatCompactRupiah(x.cost)}</td></tr>)}</tbody></table></div></article></section>
 <section className="budgetPanel"><div className="activitySectionTitle"><span>HISTORI</span><h2>Aktivitas dengan HOK</h2></div><div className="monthlyTableWrap"><table className="reportTable"><thead><tr><th>Tanggal</th><th>Aktivitas</th><th>Blok</th><th>Pelaksana</th><th>HOK</th><th>Rate</th><th>Biaya TK</th></tr></thead><tbody>{rows.map(o=><tr key={o.id}><td>{o.op_date}</td><td>{o.description}</td><td>{blocks.find(b=>b.id===o.block_id)?.name??"Umum"}</td><td>{o.worker||"-"}</td><td>{formatNumber(Number(o.labor_days??0))}</td><td>{formatCompactRupiah(Number(o.labor_rate??0))}</td><td>{formatCompactRupiah(Number(o.labor_days??0)*Number(o.labor_rate??0))}</td></tr>)}</tbody></table></div></section>
 </div>;
}
