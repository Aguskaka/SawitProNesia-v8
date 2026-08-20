"use client";

import { useMemo, useState } from "react";
import { FERTILIZER_FORMULAS, TBM_MINERAL_COMPOUND, TM_MINERAL_COMPOUND } from "@/lib/fertilizer-recommendations";

type Block = { id:string; name:string; trees:number|null; planting_year:number|null; planting_date:string|null; fertilizer_pattern:string|null; soil_type:string|null };
type Item = {name:string; dose:number; unit:string};

function ageMonths(block: Block | undefined, date: string) {
  if (!block || !date) return null;
  const target = new Date(`${date}T00:00:00`);
  const planted = block.planting_date ? new Date(`${block.planting_date}T00:00:00`) : block.planting_year ? new Date(`${block.planting_year}-01-01T00:00:00`) : null;
  if (!planted || Number.isNaN(planted.getTime())) return null;
  return Math.max(0, (target.getFullYear()-planted.getFullYear())*12 + target.getMonth()-planted.getMonth() - (target.getDate()<planted.getDate()?1:0));
}
function recommendation(months:number|null): {stage:"TBM"|"TM"; label:string; source:string; items:Item[]} | null {
  if (months === null) return null;
  if (months <= 36) {
    const row = TBM_MINERAL_COMPOUND.reduce((best,r)=>Math.abs(r.month-months)<Math.abs(best.month-months)?r:best, TBM_MINERAL_COMPOUND[0]);
    const items:Item[]=[];
    if(row.urea) items.push({name:"Urea",dose:row.urea,unit:"g/pohon"});
    if(row.npk) items.push({name:FERTILIZER_FORMULAS.tbm,dose:row.npk,unit:"g/pohon"});
    if(row.dolomite) items.push({name:"Dolomit",dose:row.dolomite,unit:"g/pohon"});
    return {stage:"TBM",label:`Umur ${months} bulan → milestone ${row.month} bulan`,source:"Acuan TBM SawitProNesia",items};
  }
  const years=months/12;
  const row = years<=4?TM_MINERAL_COMPOUND[0]:years<=8?TM_MINERAL_COMPOUND[1]:years<=15?TM_MINERAL_COMPOUND[2]:years<=20?TM_MINERAL_COMPOUND[3]:TM_MINERAL_COMPOUND[4];
  const items:Item[]=[
    {name:"Bioneensis",dose:row.semester1.bioneensis,unit:"kg/pohon"},
    {name:FERTILIZER_FORMULAS.tm,dose:row.semester1.npk,unit:"kg/pohon"},
    {name:"Urea",dose:row.semester1.urea,unit:"kg/pohon"},
    {name:"Dolomit",dose:row.semester1.dolomite,unit:"kg/pohon"},
    {name:"Borax",dose:row.semester1.borax,unit:"kg/pohon"},
  ];
  return {stage:"TM",label:`Umur ${(months/12).toFixed(1)} tahun → kelompok ${row.age} tahun (Semester I)`,source:"Acuan TM SawitProNesia",items};
}

export function FertilizerProgramForm({estateId, selectedYear, blocks, action}:{estateId:string;selectedYear:number;blocks:Block[];action:(formData:FormData)=>void}) {
  const [blockId,setBlockId]=useState(blocks[0]?.id??"");
  const [plannedDate,setPlannedDate]=useState(`${selectedYear}-08-25`);
  const [mode,setMode]=useState("auto");
  const [applyKey,setApplyKey]=useState(0);
  const block=blocks.find(b=>b.id===blockId);
  const months=useMemo(()=>ageMonths(block,plannedDate),[block,plannedDate]);
  const rec=useMemo(()=>recommendation(months),[months]);
  const autoItems=mode==="auto"&&rec?rec.items:[];
  const key=`${blockId}-${plannedDate}-${mode}-${applyKey}`;
  return <form action={action} className="fertForm" key={key}>
    <input type="hidden" name="estate_id" value={estateId}/><input type="hidden" name="selected_year" value={selectedYear}/>
    <label>Blok<select name="block_id" required value={blockId} onChange={e=>setBlockId(e.target.value)}>{blocks.map(b=><option value={b.id} key={b.id}>{b.name} · {b.trees} pohon</option>)}</select></label>
    <label>Tanggal Rencana<input name="planned_date" type="date" value={plannedDate} onChange={e=>setPlannedDate(e.target.value)} required/></label>
    <label>Pola<select name="pattern" defaultValue={block?.fertilizer_pattern||"majemuk"}><option value="majemuk">Majemuk</option><option value="tunggal">Tunggal</option><option value="kombinasi">Kombinasi</option></select></label>
    <label>Mode<select name="planning_mode" value={mode} onChange={e=>setMode(e.target.value)}><option value="auto">Auto/Recommendation</option><option value="manual">Manual</option></select></label>
    <label>Periode<input name="period_label" defaultValue={rec?.label??""}/></label>
    <label>Sumber Rekomendasi<input name="recommendation_source" defaultValue={rec?.source??"PPKS / Agronom / Manual"}/></label>
    <label>Target Umur (bulan)<input name="target_age_months" type="number" min="0" step="1" defaultValue={months??""}/></label>
    <label className="fullField">Catatan<textarea name="note" rows={2}/></label>
    <div className="fertRecommendation fullField">
      <div><span>REKOMENDASI OTOMATIS</span><b>{rec ? `${rec.stage} · ${rec.label}` : "Isi tanggal tanam blok untuk mengaktifkan rekomendasi"}</b><small>{rec ? (rec.stage==="TBM"?FERTILIZER_FORMULAS.tbm:FERTILIZER_FORMULAS.tm) : "Umur dihitung dari master Blok"}</small></div>
      {rec&&mode==="auto"?<button type="button" onClick={()=>setApplyKey(v=>v+1)}>Terapkan Ulang</button>:null}
    </div>
    <div className="fertItemHeader fullField">Item Pupuk — rekomendasi otomatis tetap dapat diedit</div>
    {[1,2,3,4,5].map((i)=>{const item=autoItems[i-1];return <div className="fertItemRow fullField" key={i}>
      <input name={`fertilizer_name_${i}`} placeholder={`Nama pupuk ${i}`} defaultValue={item?.name??""}/>
      <input name={`standard_dose_${i}`} type="number" min="0" step="0.001" placeholder="Dosis std" defaultValue={item?.dose??""}/>
      <input name={`custom_dose_${i}`} type="number" min="0" step="0.001" placeholder="Dosis custom"/>
      <select name={`dose_unit_${i}`} defaultValue={item?.unit??"g/pohon"}><option>g/pohon</option><option>kg/pohon</option><option>Kg</option></select>
      <input name={`requirement_kg_${i}`} type="number" min="0" step="0.01" placeholder="Kebutuhan Kg (otomatis)"/>
      <input name={`unit_price_${i}`} type="number" min="0" step="1" placeholder="Harga/Kg"/>
    </div>})}
    <button className="primaryButton fullField" type="submit">Simpan Program Pupuk</button>
  </form>
}
