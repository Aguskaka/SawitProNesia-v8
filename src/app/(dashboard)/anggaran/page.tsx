export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { ContextSelector } from "@/components/layout/context-selector";
import { actualCostForYear, budgetUsage } from "@/lib/calculations/budget";
import { operationCostBreakdown } from "@/lib/calculations/annual";
import { formatCompactRupiah, formatRupiah } from "@/lib/formatters";
import { saveAnnualBudget, saveBlockBudget, saveCategoryBudget } from "@/features/budgets/actions";

const CATEGORIES=["Pemupukan","Perawatan","Penyemprotan","Tenaga Kerja","Biaya","Lainnya"];
const MONTHS=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

export default async function BudgetPage({searchParams}:{searchParams:Promise<{status?:string}>}) {
 const params=await searchParams,supabase=await createClient(),context=await getAppContext();
 const [er,br,or,abr,acr,bbr]=await Promise.all([
  supabase.from("estates").select("id,name").order("created_at"),
  supabase.from("blocks").select("id,estate_id,name,area").order("name"),
  supabase.from("operations").select("*"),
  supabase.from("annual_budgets").select("*"),
  supabase.from("annual_budget_categories").select("*"),
  supabase.from("annual_block_budgets").select("*"),
 ]);
 for(const r of [er,br,or,abr,acr,bbr])if(r.error)throw new Error(r.error.message);
 const estates=er.data??[],blocks=br.data??[],ops=or.data??[],annual=abr.data??[],cats=acr.data??[],blockBudgets=bbr.data??[];
 const estateId=context.activeEstateId&&estates.some(e=>e.id===context.activeEstateId)?context.activeEstateId:estates[0]?.id??null;
 const estate=estates.find(e=>e.id===estateId)??null,estateBlocks=blocks.filter(b=>b.estate_id===estateId);
 const annualRow=annual.find(x=>x.estate_id===estateId&&x.budget_year===context.selectedYear),budget=Number(annualRow?.amount??0),actual=estateId?actualCostForYear(ops,estateId,context.selectedYear):0,usage=budgetUsage(budget,actual),actualCats=estateId?operationCostBreakdown(ops,estateId,context.selectedYear):[];
 const yearOps=ops.filter(o=>o.estate_id===estateId&&String(o.op_date).startsWith(`${context.selectedYear}-`));
 const totalArea=estateBlocks.reduce((s,b)=>s+Number(b.area??0),0);
 const costPerHa=totalArea>0?actual/totalArea:0;
 const monthsElapsed=Math.max(1,Math.min(12,new Date().getFullYear()===context.selectedYear?new Date().getMonth()+1:(new Date().getFullYear()>context.selectedYear?12:1)));
 const monthlyCosts=Array.from({length:12},(_,i)=>yearOps.filter(o=>Number(String(o.op_date).slice(5,7))===i+1).reduce((s,o)=>s+Number(o.total_cost??0),0));
 const activeMonths=Math.max(1,monthlyCosts.filter((v,i)=>v>0&&i<monthsElapsed).length||monthsElapsed);
 const runRate=actual/activeMonths;
 const outlook=runRate*12;
 const outlookVariance=budget-outlook;
 const topCategory=actualCats[0]??null;
 const maxMonth=Math.max(1,...monthlyCosts);
 const blockActuals=estateBlocks.map(b=>({id:b.id,name:b.name,area:Number(b.area??0),actual:yearOps.filter(o=>o.block_id===b.id).reduce((s,o)=>s+Number(o.total_cost??0),0)})).sort((a,b)=>b.actual-a.actual);
 const maxBlock=Math.max(1,...blockActuals.map(b=>b.actual));
 const budgetConfigured=budget>0;
 const statusLabel=!budgetConfigured?"Belum ditetapkan":usage.percentage>100?"Over budget":usage.percentage>=85?"Perlu kendali":"Terkendali";
 const statusTone=!budgetConfigured?"neutral":usage.percentage>100?"danger":usage.percentage>=85?"warning":"good";

 return <div className="v101BudgetPage">
  <section className="v101BudgetHero">
   <div className="v101BudgetHeroTop"><div><span>BUDGET & COST CONTROL CENTER</span><h1>Anggaran & Cost Control</h1><p>Pantau pagu, biaya aktual, burn rate, cost driver dan outlook akhir tahun dalam satu layar.</p></div><ContextSelector estates={estates} selectedYear={context.selectedYear} activeEstateId={estateId}/></div>
   <div className="v101BudgetSignals">
    <article><small>KEBUN AKTIF</small><strong>{estate?.name??"-"}</strong><span>{totalArea.toLocaleString("id-ID",{maximumFractionDigits:1})} Ha tercatat</span></article>
    <article><small>STATUS BUDGET</small><strong className={`v101Tone-${statusTone}`}>{statusLabel}</strong><span>{budgetConfigured?`${usage.percentage.toLocaleString("id-ID",{maximumFractionDigits:1})}% terpakai`:"Tetapkan master budget"}</span></article>
    <article><small>TOP COST DRIVER</small><strong>{topCategory?.type??"-"}</strong><span>{topCategory?formatCompactRupiah(topCategory.cost):"Belum ada biaya"}</span></article>
    <article><small>OUTLOOK AKHIR TAHUN</small><strong>{formatCompactRupiah(outlook)}</strong><span>{budgetConfigured?(outlookVariance>=0?`${formatCompactRupiah(outlookVariance)} di bawah pagu`:`${formatCompactRupiah(Math.abs(outlookVariance))} di atas pagu`):"berdasarkan run-rate aktual"}</span></article>
   </div>
  </section>
  {params.status?<div className="activityNotice">Anggaran berhasil disimpan.</div>:null}
  <section className="v101BudgetKpis">
   <article><i>Rp</i><div><small>ANGGARAN</small><strong>{formatCompactRupiah(usage.budget)}</strong><span>{formatRupiah(usage.budget)}</span></div></article>
   <article><i>↗</i><div><small>BIAYA AKTUAL</small><strong>{formatCompactRupiah(usage.actual)}</strong><span>{yearOps.length} transaksi operasional</span></div></article>
   <article className={usage.remaining<0?"alert":""}><i>∆</i><div><small>DEVIASI / SISA</small><strong>{formatCompactRupiah(usage.remaining)}</strong><span>{usage.remaining<0?"Melebihi pagu":"Masih tersedia"}</span></div></article>
   <article><i>%</i><div><small>BURN RATE</small><strong>{usage.percentage.toLocaleString("id-ID",{maximumFractionDigits:1})}%</strong><span>{formatCompactRupiah(runRate)} rata-rata / bulan aktif</span></div></article>
   <article><i>Ha</i><div><small>BIAYA / HA</small><strong>{formatCompactRupiah(costPerHa)}</strong><span>{totalArea.toLocaleString("id-ID",{maximumFractionDigits:1})} Ha basis area</span></div></article>
  </section>

  <section className="v101BudgetAnalytics">
   <article className="v101Panel v101Trend"><header><div><span>TREND BIAYA</span><h2>Burn Rate Bulanan {context.selectedYear}</h2></div><b>{formatCompactRupiah(actual)} YTD</b></header><div className="v101Bars">{monthlyCosts.map((value,i)=><div key={MONTHS[i]}><span><i style={{height:`${Math.max(value>0?7:1,(value/maxMonth)*100)}%`} as CSSProperties}/></span><b>{value?formatCompactRupiah(value):"-"}</b><small>{MONTHS[i]}</small></div>)}</div></article>
   <article className="v101Panel v101Outlook"><header><div><span>FORECAST</span><h2>Outlook Akhir Tahun</h2></div></header><div className={`v101OutlookRing ${budgetConfigured&&outlook>budget?"over":""}`} style={{"--pct":`${budgetConfigured?Math.min(100,(outlook/budget)*100):0}%`} as CSSProperties}><div><strong>{budgetConfigured?`${(outlook/budget*100).toLocaleString("id-ID",{maximumFractionDigits:0})}%`:"—"}</strong><small>vs pagu</small></div></div><div className="v101OutlookFacts"><p><span>Run-rate / bulan</span><b>{formatCompactRupiah(runRate)}</b></p><p><span>Outlook 12 bulan</span><b>{formatCompactRupiah(outlook)}</b></p><p><span>Potensi deviasi</span><b className={outlookVariance<0?"negative":"positive"}>{formatCompactRupiah(outlookVariance)}</b></p></div></article>
  </section>

  <section className="v101BudgetControlGrid">
   <article className="v101Panel"><header><div><span>COST DRIVER</span><h2>Kategori vs Budget</h2></div></header><div className="v101CategoryRows">{CATEGORIES.map(c=>{const planned=Number(cats.find(x=>x.estate_id===estateId&&x.budget_year===context.selectedYear&&x.category===c)?.amount??0),act=Number(actualCats.find(x=>x.type===c)?.cost??0),u=budgetUsage(planned,act);const pct=planned>0?u.percentage:(act>0?100:0);return <div key={c}><div className="v101RowHead"><span><b>{c}</b><small>{planned>0?`${u.percentage.toLocaleString("id-ID",{maximumFractionDigits:1})}% dari budget`:act>0?"Budget kategori belum diisi":"Belum ada biaya"}</small></span><strong>{formatCompactRupiah(act)} <em>/ {formatCompactRupiah(planned)}</em></strong></div><span className={`v101Progress ${u.percentage>100?"over":""}`}><i style={{width:`${Math.min(100,pct)}%`}}/></span></div>})}</div></article>
   <article className="v101Panel"><header><div><span>BLOCK COST</span><h2>Biaya Aktual per Blok</h2></div><small>{blockActuals.length} blok</small></header><div className="v101BlockRows">{blockActuals.length?blockActuals.map((b,i)=><div key={b.id}><i>{i+1}</i><section><b>{b.name}</b><small>{b.area.toLocaleString("id-ID",{maximumFractionDigits:1})} Ha · {b.area>0?`${formatCompactRupiah(b.actual/b.area)}/Ha`:"-"}</small><span><em style={{width:`${(b.actual/maxBlock)*100}%`}}/></span></section><strong>{formatCompactRupiah(b.actual)}</strong></div>):<p className="v101Empty">Belum ada blok pada kebun ini.</p>}</div></article>
  </section>

  <section className="v101BudgetWorkspace">
   <article className="v101Panel"><header><div><span>BUDGET SETUP</span><h2>Pengaturan Anggaran</h2></div><small>Master · kategori · blok</small></header><div className="v101BudgetForms">
    <form action={saveAnnualBudget}><input type="hidden" name="estate_id" value={estate?.id??""}/><input type="hidden" name="budget_year" value={context.selectedYear}/><b>Anggaran Tahunan</b><label>Nilai Anggaran (Rp)<input name="amount" type="number" min="0" step="1" defaultValue={budget}/></label><button className="primaryButton" type="submit" disabled={!estate}>Simpan Master Budget</button></form>
    <form action={saveCategoryBudget}><input type="hidden" name="estate_id" value={estate?.id??""}/><input type="hidden" name="budget_year" value={context.selectedYear}/><b>Budget Kategori</b><label>Kategori<select name="category">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Anggaran (Rp)<input name="amount" type="number" min="0" step="1"/></label><button className="primaryButton" type="submit" disabled={!estate}>Simpan Kategori</button></form>
    <form action={saveBlockBudget}><input type="hidden" name="estate_id" value={estate?.id??""}/><input type="hidden" name="budget_year" value={context.selectedYear}/><b>Budget per Blok</b><label>Blok<select name="block_id">{estateBlocks.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select></label><label>Kategori<select name="category">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Anggaran (Rp)<input name="amount" type="number" min="0" step="1"/></label><button className="primaryButton" type="submit" disabled={!estate||!estateBlocks.length}>Simpan Budget Blok</button></form>
   </div></article>
   <article className="v101Panel"><header><div><span>SAVED CONTROL</span><h2>Budget Blok Tersimpan</h2></div></header><div className="monthlyTableWrap"><table className="reportTable"><thead><tr><th>Blok</th><th>Kategori</th><th>Budget</th></tr></thead><tbody>{blockBudgets.filter(x=>x.estate_id===estateId&&x.budget_year===context.selectedYear).map(x=><tr key={x.id}><td>{blocks.find(b=>b.id===x.block_id)?.name??"-"}</td><td>{x.category}</td><td>{formatCompactRupiah(Number(x.amount))}</td></tr>)}</tbody></table>{!blockBudgets.some(x=>x.estate_id===estateId&&x.budget_year===context.selectedYear)?<p className="v101Empty">Belum ada budget per blok.</p>:null}</div></article>
  </section>
 </div>;
}
