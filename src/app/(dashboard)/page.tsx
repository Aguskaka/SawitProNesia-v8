export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { annualSummary, costPerKg, monthlyFinancialSeries, operationCostBreakdown, tonPerHa, transactionYear } from "@/lib/calculations/annual";
import { budgetUsage } from "@/lib/calculations/budget";
import { getCalendarPlanStatus, statusSortWeight } from "@/lib/calculations/calendar";
import { getPlanProgress } from "@/lib/calculations/plan";
import { formatCompactRupiah, formatNumber, formatRupiah } from "@/lib/formatters";
import { ContextSelector } from "@/components/layout/context-selector";

const MONTHS=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const planIcon=(type:string)=>type==="Panen"?"🌾":type==="Pemupukan"?"🧺":type==="Perawatan"?"✂️":type==="Penyemprotan"?"💧":type==="Tenaga Kerja"?"👷":"📌";
function idDate(value:string|null){if(!value)return "-";return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(`${value.slice(0,10)}T00:00:00`));}

export default async function HomePage(){
 const supabase=await createClient(),context=await getAppContext();
 const [er,br,hr,or,pr,abr]=await Promise.all([
  supabase.from("estates").select("*").order("created_at"),supabase.from("blocks").select("*").order("name"),
  supabase.from("harvests").select("*"),supabase.from("operations").select("*"),supabase.from("plans").select("*").order("planned_date"),
  supabase.from("annual_budgets").select("*")]);
 for(const r of [er,br,hr,or,pr,abr])if(r.error)throw new Error(r.error.message);
 const estates=er.data??[],blocks=br.data??[],harvests=hr.data??[],operations=or.data??[],plans=pr.data??[],budgets=abr.data??[];
 const estate=estates.find(e=>e.id===context.activeEstateId)??estates[0]??null;
 if(!estate)return <section className="emptyState"><h1>Belum ada kebun</h1><p>Belum ada estate yang dapat dibaca.</p></section>;
 const estateBlocks=blocks.filter(b=>b.estate_id===estate.id),area=estateBlocks.reduce((s,b)=>s+Number(b.area??0),0);
 const summary=annualSummary(harvests,operations,estate.id,context.selectedYear),productivity=tonPerHa(summary.productionKg,area),efficiency=costPerKg(summary.productionKg,summary.cost);
 const annualBudget=Number(budgets.find(b=>b.estate_id===estate.id&&b.budget_year===context.selectedYear)?.amount??0),usage=budgetUsage(annualBudget,summary.cost);
 const scopedPlans=plans.filter(p=>p.estate_id===estate.id&&String(p.planned_date).startsWith(`${context.selectedYear}-`));
 const today=new Date().toISOString().slice(0,10);
 const planRows=scopedPlans.map(plan=>({plan,status:getCalendarPlanStatus(plan,harvests,operations,today),progress:getPlanProgress(plan,harvests,operations),block:estateBlocks.find(b=>b.id===plan.block_id)?.name??"Seluruh Kebun"}));
 const attention=planRows.filter(r=>["Terlambat","Reminder","Hari Ini","Sebagian"].includes(r.status)).sort((a,b)=>statusSortWeight(a.status)-statusSortWeight(b.status));
 const upcoming=planRows.filter(r=>r.plan.planned_date>=today&&r.status!=="Selesai").sort((a,b)=>a.plan.planned_date.localeCompare(b.plan.planned_date)).slice(0,5);
 const finance=monthlyFinancialSeries(harvests,operations,estate.id,context.selectedYear),chartMax=Math.max(...finance.flatMap(x=>[x.revenue,x.cost]),1);
 const blockProduction=estateBlocks.map(b=>({name:b.name,kg:harvests.filter(h=>h.estate_id===estate.id&&h.block_id===b.id&&transactionYear(h.harvest_date)===context.selectedYear).reduce((s,h)=>s+Number(h.weight_kg??0),0)})).sort((a,b)=>b.kg-a.kg);
 const maxBlock=Math.max(...blockProduction.map(x=>x.kg),1),costs=operationCostBreakdown(operations,estate.id,context.selectedYear);
 const fertilizerPlans=planRows.filter(r=>r.plan.type==="Pemupukan"),fertTarget=fertilizerPlans.reduce((s,r)=>s+r.progress.target,0),fertActual=fertilizerPlans.reduce((s,r)=>s+Math.min(r.progress.actual,r.progress.target||r.progress.actual),0),fertPct=fertTarget>0?fertActual/fertTarget*100:0;
 const recent=[...harvests.filter(h=>h.estate_id===estate.id&&transactionYear(h.harvest_date)===context.selectedYear).map(h=>({id:`h-${h.id}`,icon:"🌾",title:`Panen ${estateBlocks.find(b=>b.id===h.block_id)?.name??""}`,date:h.harvest_date,value:formatCompactRupiah(Number(h.revenue??0))})),...operations.filter(o=>o.estate_id===estate.id&&transactionYear(o.op_date)===context.selectedYear).map(o=>({id:`o-${o.id}`,icon:o.type==="Pemupukan"?"🧺":o.type==="Tenaga Kerja"?"👷":"✓",title:o.description||o.type,date:o.op_date,value:formatCompactRupiah(Number(o.total_cost??0))}))].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
 const topBlock=blockProduction[0]; const marginPct=summary.revenue>0?summary.margin/summary.revenue*100:0;
 const insights=[usage.percentage>100?`Anggaran sudah terpakai ${usage.percentage.toLocaleString("id-ID",{maximumFractionDigits:1})}%. Biaya perlu dikendalikan.`:`Anggaran masih terkendali: ${usage.percentage.toLocaleString("id-ID",{maximumFractionDigits:1})}% terpakai.`,attention.some(x=>x.status==="Terlambat")?`${attention.filter(x=>x.status==="Terlambat").length} pekerjaan terlambat perlu segera direalisasikan.`:"Tidak ada pekerjaan terlambat saat ini.",topBlock&&topBlock.kg>0?`${topBlock.name} adalah kontributor produksi tertinggi: ${formatNumber(topBlock.kg)} Kg.`:"Produksi per blok belum tersedia.",efficiency>0?`Biaya produksi saat ini ${formatRupiah(efficiency)}/Kg TBS.`:"Biaya per Kg belum dapat dihitung."];
 const overdue=attention.filter(x=>x.status==="Terlambat").length;
 const healthLabel=overdue===0&&usage.percentage<=100?"Sehat":"Perlu Perhatian";
 return <div className="commandCenter v92Home">
  <section className="v92Hero">
   <div className="v92HeroGlow"/>
   <div className="v92HeroTop"><div className="v92Estate"><small>KEBUN AKTIF</small><b>{estate.name}</b></div><ContextSelector estates={estates.map(e=>({id:e.id,name:e.name}))} selectedYear={context.selectedYear} activeEstateId={estate.id}/></div>
   <div className="v92HeroCopy"><span>OWNER COMMAND CENTER</span><h1>Selamat datang 👋</h1><p>Pantau kondisi kebun, pekerjaan, produksi dan biaya dalam satu layar.</p></div>
   <div className="v92HeroStats"><div><small>Status Kebun</small><strong>{healthLabel}</strong><span>{overdue?`${overdue} pekerjaan terlambat`:`Operasional terkendali`}</span></div><div><small>Produksi YTD</small><strong>{formatNumber(summary.productionKg)} Kg</strong><span>{productivity.toLocaleString("id-ID",{maximumFractionDigits:2})} ton/Ha</span></div><div><small>Pendapatan YTD</small><strong>{formatCompactRupiah(summary.revenue)}</strong><span>{context.selectedYear}</span></div><div><small>Margin</small><strong>{marginPct.toLocaleString("id-ID",{maximumFractionDigits:1})}%</strong><span>{formatCompactRupiah(summary.margin)}</span></div></div>
  </section>
  <section className="commandKpis">
   <article className="kpiProduction"><i>🌴</i><small>Produksi (YTD)</small><strong>{formatNumber(summary.productionKg)} Kg</strong><span>{productivity.toLocaleString("id-ID",{maximumFractionDigits:2})} ton/Ha</span></article>
   <article className="kpiRevenue"><i>▣</i><small>Pendapatan (YTD)</small><strong>{formatCompactRupiah(summary.revenue)}</strong><span>{formatRupiah(summary.revenue)}</span></article>
   <article className="kpiCost"><i>◉</i><small>Biaya (YTD)</small><strong>{formatCompactRupiah(summary.cost)}</strong><span>{formatRupiah(efficiency)}/Kg</span></article>
   <article className="kpiMargin"><i>⌁</i><small>Margin (YTD)</small><strong>{formatCompactRupiah(summary.margin)}</strong><span>{marginPct.toLocaleString("id-ID",{maximumFractionDigits:1})}%</span></article>
   <article className="kpiBudget"><i>◇</i><small>Budget</small><strong>{formatCompactRupiah(annualBudget)}</strong><span>{usage.percentage.toLocaleString("id-ID",{maximumFractionDigits:1})}% terpakai</span></article>
  </section>
  <section className="commandTopGrid">
   <article className="commandPanel budgetCommand"><header><span>PENGGUNAAN BUDGET</span><Link href="/anggaran">Detail →</Link></header><div className={`budgetRing ${usage.percentage>100?"over":""}`} style={{"--pct":`${Math.min(100,usage.percentage)}%`} as React.CSSProperties}><div><strong>{usage.percentage.toLocaleString("id-ID",{maximumFractionDigits:1})}%</strong><small>Terpakai</small></div></div><div className="budgetFacts"><p><span>Anggaran</span><b>{formatCompactRupiah(annualBudget)}</b></p><p><span>Actual</span><b>{formatCompactRupiah(summary.cost)}</b></p><p><span>Sisa</span><b>{formatCompactRupiah(usage.remaining)}</b></p></div></article>
   <article className="commandPanel"><header><span>PERLU PERHATIAN</span><Link href="/kalender">Kalender →</Link></header><div className="attentionList">{attention.length?attention.slice(0,4).map(r=><Link href="/kalender" key={r.plan.id} className={`attentionItem ${r.status.toLowerCase().replace(" ","")}`}><b>{r.status}</b><span>{r.plan.type} · {r.block}</span><small>{idDate(r.plan.planned_date)}</small></Link>):<div className="commandEmpty">Tidak ada agenda yang perlu perhatian.</div>}</div></article>
   <article className="commandPanel"><header><span>AGENDA 7 HARI / BERIKUTNYA</span><Link href="/kalender">Lihat Kalender</Link></header><div className="agendaList">{upcoming.length?upcoming.map(r=><div key={r.plan.id}><time>{new Date(`${r.plan.planned_date}T00:00:00`).getDate()}<small>{MONTHS[new Date(`${r.plan.planned_date}T00:00:00`).getMonth()]}</small></time><span><b>{r.plan.type}</b><small>{r.block} · Target {formatNumber(r.progress.target)} {r.plan.unit??""}</small></span><em>{r.status}</em></div>):<div className="commandEmpty">Belum ada agenda mendatang.</div>}</div></article>
  </section>
  <section className="commandMiddleGrid">
   <article className="commandPanel"><header><span>PRODUKSI PER BLOK</span><b>{context.selectedYear}</b></header><div className="blockBars">{blockProduction.map(b=><div key={b.name}><p><b>{b.name}</b><strong>{formatNumber(b.kg)} Kg</strong></p><span><i style={{width:`${b.kg/maxBlock*100}%`}}/></span></div>)}</div></article>
   <article className="commandPanel financeCommand"><header><span>TREND PENDAPATAN VS BIAYA</span><b>{context.selectedYear}</b></header><div className="dualChart">{finance.map((m,i)=><div key={i}><span><i className="rev" style={{height:`${Math.max(m.revenue?5:0,m.revenue/chartMax*100)}%`}}/><i className="cost" style={{height:`${Math.max(m.cost?5:0,m.cost/chartMax*100)}%`}}/></span><small>{MONTHS[i]}</small></div>)}</div><div className="chartLegend"><span>● Pendapatan</span><span>● Biaya</span></div></article>
  </section>
  <section className="commandBottomGrid">
   <article className="commandPanel"><header><span>PROGRESS PEMUPUKAN</span><Link href="/pupuk">Lihat Detail</Link></header><div className="fertProgress"><div className="miniRing" style={{"--pct":`${Math.min(100,fertPct)}%`} as React.CSSProperties}><strong>{fertPct.toLocaleString("id-ID",{maximumFractionDigits:0})}%</strong></div><div><p><span>Total Rencana</span><b>{formatNumber(fertTarget)} Kg</b></p><p><span>Realisasi</span><b>{formatNumber(fertActual)} Kg</b></p><p><span>Sisa</span><b>{formatNumber(Math.max(0,fertTarget-fertActual))} Kg</b></p></div></div></article>
   <article className="commandPanel"><header><span>💡 OWNER INSIGHT</span><Link href="/analytics">Analytics →</Link></header><div className="ownerInsights">{insights.map((x,i)=><p key={i}>{x}</p>)}</div></article>
   <article className="commandPanel"><header><span>AKTIVITAS TERAKHIR</span><Link href="/aktivitas">Lihat Semua</Link></header><div className="commandRecent">{recent.map(x=><div key={x.id}><i>{x.icon}</i><span><b>{x.title}</b><small>{idDate(x.date)}</small></span><strong>{x.value}</strong></div>)}</div></article>
  </section>
  <section className="quickActions"><span>AKSI CEPAT</span><div><Link href="/rencana">🗓️<b>Rencana Baru</b></Link><Link href="/aktivitas">✅<b>Realisasi Aktivitas</b></Link><Link href="/panen">🌾<b>Catat Panen</b></Link><Link href="/tenaga-kerja">👷<b>Input Tenaga</b></Link><Link href="/laporan">📋<b>Laporan</b></Link><Link href="/analytics">📊<b>Analytics</b></Link></div></section>
 </div>;
}
