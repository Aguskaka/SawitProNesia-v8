export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { ContextSelector } from "@/components/layout/context-selector";
import { actualCostForYear, budgetUsage } from "@/lib/calculations/budget";
import { operationCostBreakdown } from "@/lib/calculations/annual";
import { formatCompactRupiah, formatRupiah } from "@/lib/formatters";
import { saveAnnualBudget, saveBlockBudget, saveCategoryBudget } from "@/features/budgets/actions";

const CATEGORIES=["Pemupukan","Perawatan","Penyemprotan","Tenaga Kerja","Biaya","Lainnya"];

export default async function BudgetPage({searchParams}:{searchParams:Promise<{status?:string}>}) {
 const params=await searchParams,supabase=await createClient(),context=await getAppContext();
 const [er,br,or,abr,acr,bbr]=await Promise.all([
  supabase.from("estates").select("id,name").order("created_at"),
  supabase.from("blocks").select("id,estate_id,name").order("name"),
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
 return <div className="budgetPage">
  <section className="planningHeading"><div><span>OWNER BUDGET CONTROL</span><h1>Anggaran Kebun</h1><p>Budget tahunan, kategori, dan blok dibandingkan dengan biaya Actual dari operations.</p></div><ContextSelector estates={estates} selectedYear={context.selectedYear} activeEstateId={estateId}/></section>
  {params.status?<div className="activityNotice">Anggaran berhasil disimpan.</div>:null}
  <section className="budgetHero"><div><span>BUDGET {context.selectedYear}</span><h2>{estate?.name??"-"}</h2><p>{usage.percentage.toLocaleString("id-ID",{maximumFractionDigits:1})}% terpakai</p></div><div><small>SISA ANGGARAN</small><strong>{formatCompactRupiah(usage.remaining)}</strong></div></section>
  <section className="budgetKpis"><article><small>Anggaran</small><strong>{formatCompactRupiah(usage.budget)}</strong><span>{formatRupiah(usage.budget)}</span></article><article><small>Actual</small><strong>{formatCompactRupiah(usage.actual)}</strong><span>operations {context.selectedYear}</span></article><article><small>Sisa</small><strong>{formatCompactRupiah(usage.remaining)}</strong><span>{usage.remaining<0?"Over budget":"Available"}</span></article><article><small>Terpakai</small><strong>{usage.percentage.toLocaleString("id-ID",{maximumFractionDigits:1})}%</strong><span>Actual ÷ Budget</span></article></section>
  <section className="budgetGrid">
   <article className="budgetPanel"><div className="activitySectionTitle"><span>MASTER BUDGET</span><h2>Anggaran Tahunan</h2></div>{estate?<form action={saveAnnualBudget} className="budgetForm"><input type="hidden" name="estate_id" value={estate.id}/><input type="hidden" name="budget_year" value={context.selectedYear}/><label>Nilai Anggaran (Rp)<input name="amount" type="number" min="0" step="1" defaultValue={budget}/></label><button className="primaryButton" type="submit">Simpan Anggaran</button></form>:null}</article>
   <article className="budgetPanel"><div className="activitySectionTitle"><span>KATEGORI</span><h2>Budget per Kategori</h2></div>{estate?<form action={saveCategoryBudget} className="budgetForm"><input type="hidden" name="estate_id" value={estate.id}/><input type="hidden" name="budget_year" value={context.selectedYear}/><label>Kategori<select name="category">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Anggaran (Rp)<input name="amount" type="number" min="0" step="1"/></label><button className="primaryButton" type="submit">Simpan Kategori</button></form>:null}</article>
   <article className="budgetPanel"><div className="activitySectionTitle"><span>PER BLOK</span><h2>Budget Blok</h2></div>{estate?<form action={saveBlockBudget} className="budgetForm"><input type="hidden" name="estate_id" value={estate.id}/><input type="hidden" name="budget_year" value={context.selectedYear}/><label>Blok<select name="block_id">{estateBlocks.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select></label><label>Kategori<select name="category">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Anggaran (Rp)<input name="amount" type="number" min="0" step="1"/></label><button className="primaryButton" type="submit">Simpan Budget Blok</button></form>:null}</article>
  </section>
  <section className="budgetGrid budgetDetailGrid">
   <article className="budgetPanel"><div className="activitySectionTitle"><span>CONTROL</span><h2>Kategori vs Actual</h2></div><div className="budgetRows">{CATEGORIES.map(c=>{const planned=Number(cats.find(x=>x.estate_id===estateId&&x.budget_year===context.selectedYear&&x.category===c)?.amount??0),act=Number(actualCats.find(x=>x.type===c)?.cost??0),u=budgetUsage(planned,act);return <div className="budgetRow" key={c}><div><b>{c}</b><small>{u.percentage.toLocaleString("id-ID",{maximumFractionDigits:1})}%</small></div><span><i style={{width:`${Math.min(100,u.percentage)}%`}}/></span><strong>{formatCompactRupiah(act)} / {formatCompactRupiah(planned)}</strong></div>})}</div></article>
   <article className="budgetPanel"><div className="activitySectionTitle"><span>BLOCK CONTROL</span><h2>Budget Tersimpan per Blok</h2></div><div className="monthlyTableWrap"><table className="reportTable"><thead><tr><th>Blok</th><th>Kategori</th><th>Budget</th></tr></thead><tbody>{blockBudgets.filter(x=>x.estate_id===estateId&&x.budget_year===context.selectedYear).map(x=><tr key={x.id}><td>{blocks.find(b=>b.id===x.block_id)?.name??"-"}</td><td>{x.category}</td><td>{formatCompactRupiah(Number(x.amount))}</td></tr>)}</tbody></table></div></article>
  </section>
 </div>;
}
