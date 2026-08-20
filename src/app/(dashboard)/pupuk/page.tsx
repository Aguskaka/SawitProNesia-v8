export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { ContextSelector } from "@/components/layout/context-selector";
import { createFertilizerProgram } from "@/features/fertilizer/actions";
import { fertilizerProgramProgress } from "@/lib/calculations/fertilizer";
import { formatCompactRupiah, formatNumber } from "@/lib/formatters";
import { FERTILIZER_FORMULAS, TBM_MINERAL_COMPOUND, TM_MINERAL_COMPOUND } from "@/lib/fertilizer-recommendations";
import { FertilizerProgramForm } from "@/components/fertilizer-program-form";

function idDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${value}T00:00:00`));
}

export default async function FertilizerPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const context = await getAppContext();

  const [er, br, pr, ir, exr, eir] = await Promise.all([
    supabase.from("estates").select("id,name").order("created_at"),
    supabase.from("blocks").select("id,estate_id,name,trees,fertilizer_pattern,planting_year,planting_date,soil_type").order("name"),
    supabase.from("fertilizer_programs").select("*").order("planned_date"),
    supabase.from("fertilizer_program_items").select("*").order("sort_order"),
    supabase.from("fertilizer_executions").select("*"),
    supabase.from("fertilizer_execution_items").select("*"),
  ]);

  for (const r of [er, br, pr, ir, exr, eir]) if (r.error) throw new Error(r.error.message);

  const estates = er.data ?? [], blocks = br.data ?? [], programs = pr.data ?? [],
    items = ir.data ?? [], executions = exr.data ?? [], executionItems = eir.data ?? [];

  const estateId =
    context.activeEstateId && estates.some((e) => e.id === context.activeEstateId)
      ? context.activeEstateId
      : estates[0]?.id ?? null;
  const estate = estates.find((e) => e.id === estateId) ?? null;
  const estateBlocks = blocks.filter((b) => b.estate_id === estateId);
  const scoped = programs.filter(
    (p) =>
      p.estate_id === estateId &&
      String(p.planned_date).startsWith(`${context.selectedYear}-`),
  );

  const rows = scoped.map((program) => {
    const programItems = items.filter((x) => x.program_id === program.id);
    const executionIds = executions.filter((x) => x.program_id === program.id).map((x) => x.id);
    const execItems = executionItems.filter((x) => executionIds.includes(x.execution_id));
    const progress = fertilizerProgramProgress(programItems, execItems);
    const estimatedCost = programItems.reduce((sum, x) => sum + Number(x.estimated_cost ?? 0), 0);
    const actualCost = execItems.reduce((sum, x) => sum + Number(x.actual_cost ?? 0), 0);
    return { program, programItems, progress, estimatedCost, actualCost };
  });

  const estimated = rows.reduce((s, r) => s + r.estimatedCost, 0);
  const actual = rows.reduce((s, r) => s + r.actualCost, 0);
  const unfinished = rows.filter((r) => r.progress.status !== "Selesai").length;

  return (
    <div className="fertPage">
      <section className="planningHeading">
        <div>
          <span>FERTILIZER MANAGEMENT</span>
          <h1>Program Pemupukan</h1>
          <p>Rencana dosis, kebutuhan, estimasi biaya, dan realisasi pupuk terhubung ke operations tanpa menghitung ganda.</p>
        </div>
        <ContextSelector estates={estates} selectedYear={context.selectedYear} activeEstateId={estateId} />
      </section>

      {params.status ? <div className="activityNotice">Perubahan program pupuk tersimpan.</div> : null}

      <section className="fertKpis">
        <article><small>Program</small><strong>{rows.length}</strong><span>{estate?.name ?? "-"}</span></article>
        <article><small>Belum Selesai</small><strong>{unfinished}</strong><span>Terjadwal / sebagian</span></article>
        <article><small>Estimasi Biaya</small><strong>{formatCompactRupiah(estimated)}</strong><span>Program {context.selectedYear}</span></article>
        <article><small>Actual Biaya</small><strong>{formatCompactRupiah(actual)}</strong><span>Dari execution items</span></article>
      </section>


      <nav className="fertTabs" aria-label="Navigasi pemupukan">
        <a href="#program">Program Pemupukan</a><a href="#program">Realisasi</a><a href="#acuan">Acuan Dosis</a>
      </nav>

      <section className="fertReferencePanel" id="acuan">
        <div className="fertReferenceHead">
          <div>
            <span>ACUAN DOSIS PEMUPUKAN</span>
            <h2>TBM & TM — Tanah Mineral</h2>
            <p>Dosis referensi dikembalikan dari baseline agronomi SawitProNesia lama. Dosis kebun tetap dapat disesuaikan berdasarkan analisis tanah/daun dan rekomendasi agronom.</p>
          </div>
          <div className="fertFormulaBadges">
            <b>TBM · {FERTILIZER_FORMULAS.tbm}</b>
            <b>TM · {FERTILIZER_FORMULAS.tm}</b>
          </div>
        </div>

        <div className="fertReferenceGrid">
          <article>
            <header><span>TBM · MAJEMUK</span><h3>Milestone Umur Tanaman</h3><small>Satuan gram/pohon/aplikasi</small></header>
            <div className="fertReferenceTableWrap">
              <table className="fertReferenceTable">
                <thead><tr><th>Umur</th><th>Urea</th><th>NPK 12.12.17</th><th>Dolomit</th></tr></thead>
                <tbody>
                  {TBM_MINERAL_COMPOUND.map((row) => (
                    <tr key={row.month}>
                      <td><b>{row.month} bln</b></td>
                      <td>{row.urea || "—"}</td>
                      <td>{row.npk || "—"}</td>
                      <td>{row.dolomite || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article>
            <header><span>TM · MAJEMUK</span><h3>Kelompok Umur Produktif</h3><small>Satuan kg/pohon; dibagi Semester I & II</small></header>
            <div className="fertReferenceTableWrap">
              <table className="fertReferenceTable tmReferenceTable">
                <thead><tr><th>Umur</th><th>Semester I</th><th>Semester II</th><th>Total/thn</th></tr></thead>
                <tbody>
                  {TM_MINERAL_COMPOUND.map((row) => (
                    <tr key={row.age}>
                      <td><b>{row.age} th</b></td>
                      <td>
                        Bioneensis {row.semester1.bioneensis} · NPK {row.semester1.npk} · Urea {row.semester1.urea} · Dol {row.semester1.dolomite} · Borax {row.semester1.borax}
                      </td>
                      <td>NPK {row.semester2.npk} · Bioneensis {row.semester2.bioneensis}</td>
                      <td><b>{row.annual} kg</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <div className="fertReferenceNote">
          <b>Catatan formula:</b>
          <span>TBM memakai NPK 12.12.17.2 + 0,75B. TM memakai NPK 13.6.27.4 + 0,65B. Formula NPK lain perlu dikonversi berdasarkan kandungan hara, bukan disamakan beratnya.</span>
        </div>
      </section>

      <section className="fertWorkspace" id="program">
        <aside className="fertComposer">
          <div className="activitySectionTitle"><span>＋ PROGRAM BARU</span><h2>Rencana Pemupukan</h2></div>
          {estate && estateBlocks.length ? (
            <FertilizerProgramForm estateId={estate.id} selectedYear={context.selectedYear} blocks={estateBlocks} action={createFertilizerProgram} />
          ) : <div className="emptyState">Tambahkan blok terlebih dahulu.</div>}
        </aside>

        <div className="fertHistory">
          <div className="activitySectionTitle"><span>PROGRAM {context.selectedYear}</span><h2>{estate?.name ?? "Kebun"}</h2></div>
          <div className="fertList">
            {rows.map(({program,programItems,progress,estimatedCost,actualCost})=>{
              const block=blocks.find((b)=>b.id===program.block_id);
              return <Link className="fertRow" href={`/pupuk/${program.id}`} key={program.id}>
                <span className="fertIcon">🧺</span>
                <div><b>{block?.name ?? "-"} · {program.period_label || program.pattern}</b><small>{idDate(program.planned_date)} · {programItems.map(i=>i.fertilizer_name).join(", ")}</small><div className="miniPlanProgress"><div style={{width:`${Math.min(progress.percentage,100)}%`}}/></div></div>
                <div className="fertRowRight"><strong>{formatNumber(progress.actualKg)} / {formatNumber(progress.plannedKg)} Kg</strong><span className={`planStatus ${progress.status.toLowerCase()}`}>{progress.status}</span><small>{formatCompactRupiah(actualCost)} / est. {formatCompactRupiah(estimatedCost)}</small></div>
              </Link>;
            })}
            {!rows.length?<div className="emptyActivity">Belum ada program pupuk pada tahun ini.</div>:null}
          </div>
        </div>
      </section>
    </div>
  );
}
