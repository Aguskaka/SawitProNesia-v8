export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { annualSummary, costPerKg, monthlyFinancialSeries, tonPerHa, transactionYear } from "@/lib/calculations/annual";
import { budgetUsage } from "@/lib/calculations/budget";
import { getCalendarPlanStatus, statusSortWeight } from "@/lib/calculations/calendar";
import type { CalendarPlanStatus } from "@/lib/calculations/calendar";
import { getPlanProgress } from "@/lib/calculations/plan";
import { getEstateStage } from "@/lib/calculations/estate-stage";
import { fertilizerProgramProgress } from "@/lib/calculations/fertilizer";
import { formatCompactRupiah, formatNumber, formatRupiah } from "@/lib/formatters";
import { ContextSelector } from "@/components/layout/context-selector";

const MONTHS=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
function idDate(value:string|null){if(!value)return "-";return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(`${value.slice(0,10)}T00:00:00`));}

export default async function HomePage(){
 const supabase=await createClient(),context=await getAppContext();
 const [er,br,hr,or,pr,abr,fpr,fpir,fer,feir]=await Promise.all([
  supabase.from("estates").select("*").order("created_at"),
  supabase.from("blocks").select("*").order("name"),
  supabase.from("harvests").select("*"),
  supabase.from("operations").select("*"),
  supabase.from("plans").select("*").order("planned_date"),
  supabase.from("annual_budgets").select("*"),
  supabase.from("fertilizer_programs").select("*").order("planned_date"),
  supabase.from("fertilizer_program_items").select("*").order("sort_order"),
  supabase.from("fertilizer_executions").select("*"),
  supabase.from("fertilizer_execution_items").select("*")
 ]);
 for(const r of [er,br,hr,or,pr,abr,fpr,fpir,fer,feir])if(r.error)throw new Error(r.error.message);
 const estates=er.data??[],blocks=br.data??[],harvests=hr.data??[],operations=or.data??[],plans=pr.data??[],budgets=abr.data??[];
 const fertilizerPrograms=fpr.data??[],fertilizerItems=fpir.data??[],fertilizerExecutions=fer.data??[],fertilizerExecutionItems=feir.data??[];
 const estate=estates.find(e=>e.id===context.activeEstateId)??estates[0]??null;
 if(!estate)return <section className="emptyState"><h1>Belum ada kebun</h1><p>Belum ada estate yang dapat dibaca.</p></section>;
 const estateBlocks=blocks.filter(b=>b.estate_id===estate.id),area=estateBlocks.reduce((s,b)=>s+Number(b.area??0),0),trees=estateBlocks.reduce((s,b)=>s+Number(b.trees??0),0),stage=getEstateStage(blocks,estate.id,context.selectedYear);
 const summary=annualSummary(harvests,operations,estate.id,context.selectedYear),productivity=tonPerHa(summary.productionKg,area),efficiency=costPerKg(summary.productionKg,summary.cost);
 const annualBudget=Number(budgets.find(b=>b.estate_id===estate.id&&b.budget_year===context.selectedYear)?.amount??0),usage=budgetUsage(annualBudget,summary.cost);
 const scopedPlans=plans.filter(p=>p.estate_id===estate.id&&String(p.planned_date).startsWith(`${context.selectedYear}-`));
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const planRows=scopedPlans.map(plan=>({kind:"plan" as const,id:plan.id,type:plan.type,date:plan.planned_date,status:getCalendarPlanStatus(plan,harvests,operations,today),progress:getPlanProgress(plan,harvests,operations),block:estateBlocks.find(b=>b.id===plan.block_id)?.name??"Seluruh Kebun"}));

 const scopedFertilizerPrograms=fertilizerPrograms.filter(p=>p.estate_id===estate.id&&String(p.planned_date).startsWith(`${context.selectedYear}-`));
 const fertilizerRows=scopedFertilizerPrograms.map(program=>{
   const items=fertilizerItems.filter(x=>x.program_id===program.id);
   const executionIds=fertilizerExecutions.filter(x=>x.program_id===program.id).map(x=>x.id);
   const execItems=fertilizerExecutionItems.filter(x=>executionIds.includes(x.execution_id));
   const progress=fertilizerProgramProgress(items,execItems);
   const block=estateBlocks.find(b=>b.id===program.block_id)?.name??"Blok";
   let status=progress.status;
   if(status!=="Selesai"&&program.planned_date<today)status="Terlambat";
   else if(status==="Terjadwal"&&program.planned_date===today)status="Hari Ini";
   return {kind:"fertilizer" as const,id:program.id,type:"Pemupukan",date:program.planned_date,status,progress:{target:progress.plannedKg,actual:progress.actualKg,percentage:progress.percentage},block};
 });
 const agendaRows=[...planRows,...fertilizerRows];
 const attention=agendaRows.filter(r=>["Terlambat","Reminder","Hari Ini","Sebagian"].includes(r.status)).sort((a,b)=>statusSortWeight(a.status as CalendarPlanStatus)-statusSortWeight(b.status as CalendarPlanStatus));
 const upcoming=agendaRows.filter(r=>r.date>=today&&r.status!=="Selesai").sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
 const finance=monthlyFinancialSeries(harvests,operations,estate.id,context.selectedYear),chartMax=Math.max(...finance.flatMap(x=>[x.revenue,x.cost]),1);
 const blockProduction=estateBlocks.map(b=>({name:b.name,kg:harvests.filter(h=>h.estate_id===estate.id&&h.block_id===b.id&&transactionYear(h.harvest_date)===context.selectedYear).reduce((s,h)=>s+Number(h.weight_kg??0),0)})).sort((a,b)=>b.kg-a.kg);
 const maxBlock=Math.max(...blockProduction.map(x=>x.kg),1);
 const fertTarget=fertilizerRows.reduce((s,r)=>s+Number(r.progress.target??0),0),fertActual=fertilizerRows.reduce((s,r)=>s+Math.min(Number(r.progress.actual??0),Number(r.progress.target??0)||Number(r.progress.actual??0)),0),fertPct=fertTarget>0?fertActual/fertTarget*100:0;
 const recent=[...harvests.filter(h=>h.estate_id===estate.id&&transactionYear(h.harvest_date)===context.selectedYear).map(h=>({id:`h-${h.id}`,icon:"🌾",title:`Panen ${estateBlocks.find(b=>b.id===h.block_id)?.name??""}`,date:h.harvest_date,value:formatCompactRupiah(Number(h.revenue??0))})),...operations.filter(o=>o.estate_id===estate.id&&transactionYear(o.op_date)===context.selectedYear).map(o=>({id:`o-${o.id}`,icon:o.type==="Pemupukan"?"🧺":o.type==="Tenaga Kerja"?"👷":"✓",title:o.description||o.type,date:o.op_date,value:formatCompactRupiah(Number(o.total_cost??0))}))].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
 const topBlock=blockProduction[0];
 const marginPct=summary.revenue>0?summary.margin/summary.revenue*100:0;
 const overdue=attention.filter(x=>x.status==="Terlambat").length;
 const budgetConfigured=annualBudget>0;
 const overBudget=budgetConfigured&&summary.cost>annualBudget;
 const negativeMargin=summary.revenue>0&&summary.margin<0;
 const needsAttention=overdue>0||overBudget||negativeMargin;
 const healthLabel=needsAttention?"Perlu Perhatian":(summary.revenue===0&&summary.cost>0?"Fase Investasi":"Sehat");
 const healthNote=overdue>0?`${overdue} pekerjaan terlambat`:overBudget?"Biaya melebihi anggaran":negativeMargin?"Margin negatif":summary.revenue===0&&summary.cost>0?"Belum ada pendapatan pada periode ini":"Operasional terkendali";
 const insights=[
   !budgetConfigured?`Anggaran ${context.selectedYear} belum ditetapkan. Actual biaya saat ini ${formatCompactRupiah(summary.cost)}.`:usage.percentage>100?`Anggaran sudah terpakai ${usage.percentage.toLocaleString("id-ID",{maximumFractionDigits:1})}%. Biaya perlu dikendalikan.`:`Anggaran masih terkendali: ${usage.percentage.toLocaleString("id-ID",{maximumFractionDigits:1})}% terpakai.`,
   overdue>0?`${overdue} pekerjaan terlambat perlu segera direalisasikan.`:"Tidak ada pekerjaan terlambat saat ini.",
   topBlock&&topBlock.kg>0?`${topBlock.name} adalah kontributor produksi tertinggi: ${formatNumber(topBlock.kg)} Kg.`:`Belum ada produksi panen ${context.selectedYear}; kebun masih berada pada fase ${stage}.`,
   efficiency>0?`Biaya produksi saat ini ${formatRupiah(efficiency)}/Kg TBS.`:`Actual biaya ${formatCompactRupiah(summary.cost)} belum dapat dibagi per Kg karena belum ada produksi.`
 ];
 return <div className="commandCenter v92Home v931Home v932Home">
  <section className="v931Hero">
   <div className="v931HeroTop">
    <div><span>OWNER COMMAND CENTER</span><h1>{estate.name}</h1><p>{context.selectedYear} · {stage} · {estateBlocks.length} blok · {formatNumber(area)} Ha · {formatNumber(trees)} pohon</p><small className="v931HeroHint">Ringkasan keputusan hari ini — detail finansial hanya ditampilkan sekali pada KPI utama.</small></div>
    <ContextSelector estates={estates.map(e=>({id:e.id,name:e.name}))} selectedYear={context.selectedYear} activeEstateId={estate.id}/>
   </div>
   <div className="v931Health">
    <div className={`v931HealthBadge ${needsAttention?"warn":healthLabel==="Fase Investasi"?"invest":"good"}`}><i>✓</i><span><small>STATUS KEBUN</small><strong>{healthLabel}</strong><em>{healthNote}</em></span></div>
    <div className="v931HeroSignals">
      <div><small>Perlu perhatian</small><strong>{attention.length}</strong><span>{overdue} terlambat</span></div>
      <div><small>Agenda berikutnya</small><strong>{upcoming.length}</strong><span>aktivitas terjadwal</span></div>
      <div><small>Progress pupuk</small><strong>{fertPct.toLocaleString("id-ID",{maximumFractionDigits:0})}%</strong><span>{formatNumber(fertActual)} / {formatNumber(fertTarget)} Kg</span></div>
    </div>
   </div>
  </section>

  <section className="v931KpiRow">
   <article><span>PRODUKSI YTD</span><strong>{formatNumber(summary.productionKg)} Kg</strong><small>{productivity.toLocaleString("id-ID",{maximumFractionDigits:2})} ton/Ha</small></article>
   <article><span>PENDAPATAN YTD</span><strong>{formatCompactRupiah(summary.revenue)}</strong><small>{summary.productionKg>0?`${formatRupiah(summary.revenue/summary.productionKg)}/Kg`:"Belum ada panen"}</small></article>
   <article><span>BIAYA AKTUAL</span><strong>{formatCompactRupiah(summary.cost)}</strong><small>{efficiency>0?`${formatRupiah(efficiency)}/Kg`:"Biaya berjalan"}</small></article>
   <article className={summary.margin<0?"negative":""}><span>MARGIN</span><strong>{formatCompactRupiah(summary.margin)}</strong><small>{summary.revenue>0?`${marginPct.toLocaleString("id-ID",{maximumFractionDigits:1})}%`:"Belum ada pendapatan"}</small></article>
  </section>

  <section className="v931PriorityGrid">
   <article className="commandPanel v931Attention">
    <header><span>PERLU PERHATIAN</span><Link href="/kalender">Lihat semua →</Link></header>
    <div className="attentionList">{attention.length?attention.slice(0,4).map(r=><Link href={r.kind==="fertilizer"?`/pupuk/${r.id}`:"/kalender"} key={`${r.kind}-${r.id}`} className={`attentionItem ${r.status.toLowerCase().replace(" ","")}`}><b>{r.status}</b><span>{r.type} · {r.block}</span><small>{idDate(r.date)}</small></Link>):<div className="commandEmpty">Tidak ada pekerjaan yang membutuhkan tindakan segera.</div>}</div>
   </article>
   <article className="commandPanel v931Agenda">
    <header><span>AGENDA BERIKUTNYA</span><Link href="/kalender">Kalender →</Link></header>
    <div className="agendaList">{upcoming.length?upcoming.map(r=><div key={`${r.kind}-${r.id}`}><time>{new Date(`${r.date}T00:00:00`).getDate()}<small>{MONTHS[new Date(`${r.date}T00:00:00`).getMonth()]}</small></time><span><b>{r.type}</b><small>{r.block} · Target {formatNumber(r.progress.target)} {r.kind==="fertilizer"?"Kg":""}</small></span><em>{r.status}</em></div>):<div className="commandEmpty">Belum ada agenda mendatang.</div>}</div>
   </article>
   <article className="commandPanel v931Budget">
    <header><span>ANGGARAN</span><Link href="/anggaran">Kelola →</Link></header>
    {budgetConfigured?<><div className={`budgetRing ${usage.percentage>100?"over":""}`} style={{"--pct":`${Math.min(100,usage.percentage)}%`} as React.CSSProperties}><div><strong>{usage.percentage.toLocaleString("id-ID",{maximumFractionDigits:1})}%</strong><small>Terpakai</small></div></div><div className="budgetFacts"><p><span>Pagu</span><b>{formatCompactRupiah(annualBudget)}</b></p><p><span>Actual</span><b>{formatCompactRupiah(summary.cost)}</b></p><p><span>Sisa</span><b>{formatCompactRupiah(usage.remaining)}</b></p></div></>:<div className="v931BudgetEmpty"><strong>Anggaran {context.selectedYear} belum ditetapkan</strong><span>Actual biaya saat ini {formatCompactRupiah(summary.cost)}.</span><Link href="/anggaran">Tetapkan anggaran →</Link></div>}
   </article>
  </section>

  <section className="v931PerformanceGrid">
   <article className="commandPanel"><header><span>KINERJA PRODUKSI PER BLOK</span><Link href="/analytics">Detail →</Link></header><div className="blockBars">{blockProduction.map(b=><div key={b.name}><p><b>{b.name}</b><strong>{formatNumber(b.kg)} Kg</strong></p><span><i style={{width:`${b.kg/maxBlock*100}%`}}/></span></div>)}</div>{!blockProduction.some(x=>x.kg>0)?<div className="v931InlineNote">Belum ada produksi panen pada {context.selectedYear}.</div>:null}</article>
   <article className="commandPanel financeCommand"><header><span>TREND PENDAPATAN VS BIAYA</span><Link href="/laporan">Laporan →</Link></header><div className="dualChart">{finance.map((m,i)=><div key={i}><span><i className="rev" style={{height:`${Math.max(m.revenue?5:0,m.revenue/chartMax*100)}%`}}/><i className="cost" style={{height:`${Math.max(m.cost?5:0,m.cost/chartMax*100)}%`}}/></span><small>{MONTHS[i]}</small></div>)}</div><div className="chartLegend"><span>● Pendapatan</span><span>● Biaya</span></div></article>
  </section>

  <section className="v931InsightGrid">
   <article className="commandPanel"><header><span>PROGRESS PEMUPUKAN</span><Link href="/pupuk">Detail →</Link></header><div className="fertProgress"><div className="miniRing" style={{"--pct":`${Math.min(100,fertPct)}%`} as React.CSSProperties}><strong>{fertPct.toLocaleString("id-ID",{maximumFractionDigits:0})}%</strong></div><div><p><span>Target</span><b>{formatNumber(fertTarget)} Kg</b></p><p><span>Realisasi</span><b>{formatNumber(fertActual)} Kg</b></p><p><span>Sisa</span><b>{formatNumber(Math.max(0,fertTarget-fertActual))} Kg</b></p></div></div></article>
   <article className="commandPanel"><header><span>OWNER INSIGHT</span><Link href="/analytics">Analytics →</Link></header><div className="ownerInsights">{insights.map((x,i)=><p key={i}>{x}</p>)}</div></article>
   <article className="commandPanel"><header><span>AKTIVITAS TERAKHIR</span><Link href="/aktivitas">Semua →</Link></header><div className="commandRecent">{recent.map(x=><div key={x.id}><i>{x.icon}</i><span><b>{x.title}</b><small>{idDate(x.date)}</small></span><strong>{x.value}</strong></div>)}</div></article>
  </section>

  <section className="quickActions v931Quick"><span>AKSI CEPAT</span><div><Link href="/rencana">🗓️<b>Rencana Baru</b></Link><Link href="/aktivitas">✅<b>Catat Aktivitas</b></Link><Link href="/panen">🌾<b>Catat Panen</b></Link><Link href="/pupuk">🧺<b>Pemupukan</b></Link><Link href="/tenaga-kerja">👷<b>Tenaga Kerja</b></Link><Link href="/laporan">📋<b>Laporan</b></Link><Link href="/analytics">📊<b>Analytics</b></Link></div></section>

 </div>;
}
