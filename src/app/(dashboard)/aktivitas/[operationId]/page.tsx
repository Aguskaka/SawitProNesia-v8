export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCompactRupiah, formatNumber, formatRupiah } from "@/lib/formatters";
import {
  deleteDirectOperation,
  updateDirectOperation,
} from "@/features/operations/actions";

function idDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default async function ActivityDetail({
  params,
}: {
  params: Promise<{ operationId: string }>;
}) {
  const { operationId } = await params;
  const supabase = await createClient();

  const { data: operation, error } = await supabase
    .from("operations")
    .select("*")
    .eq("id", operationId)
    .single();

  if (error || !operation) notFound();

  const [estateResult, blockResult] = await Promise.all([
    supabase.from("estates").select("id,name").eq("id", operation.estate_id).single(),
    supabase.from("blocks").select("id,estate_id,name").eq("estate_id", operation.estate_id).order("name"),
  ]);

  if (estateResult.error || !estateResult.data) notFound();
  if (blockResult.error) throw new Error(blockResult.error.message);

  const estate = estateResult.data;
  const blocks = blockResult.data ?? [];
  const currentBlock = blocks.find((b) => b.id === operation.block_id);
  const editable =
    operation.source === "DIRECT" &&
    !operation.plan_id &&
    !operation.fertilizer_program_id;

  const updateAction = updateDirectOperation.bind(null, operation.id);
  const deleteAction = deleteDirectOperation.bind(null, operation.id);

  return (
    <div className="activityDetailPage">
      <Link href="/aktivitas" className="backLink">← Kembali ke Aktivitas</Link>

      <section className="activityDetailHero">
        <div>
          <span>ACTUAL TRANSACTION</span>
          <h1>{operation.description}</h1>
          <p>
            {estate.name} · {currentBlock?.name ?? "Umum Kebun"} · {idDate(operation.op_date)}
          </p>
        </div>
        <div className="detailSource">
          <b className={editable ? "directPill" : "planPill"}>
            {editable ? "DIRECT" : "PROGRAM"}
          </b>
          <strong>{formatCompactRupiah(Number(operation.total_cost ?? 0))}</strong>
        </div>
      </section>

      <section className="activityInfoGrid">
        <article><small>Jenis</small><strong>{operation.type}</strong></article>
        <article>
          <small>Kuantitas</small>
          <strong>{formatNumber(Number(operation.quantity ?? 0))} {operation.unit ?? ""}</strong>
        </article>
        <article>
          <small>Material</small>
          <strong>{formatRupiah(Number(operation.quantity ?? 0) * Number(operation.unit_price ?? 0))}</strong>
        </article>
        <article>
          <small>Tenaga Kerja</small>
          <strong>{formatRupiah(Number(operation.labor_days ?? 0) * Number(operation.labor_rate ?? 0))}</strong>
        </article>
      </section>

      {editable ? (
        <>
          <section className="editPanel">
            <div className="activitySectionTitle">
              <span>DIRECT ACTUAL</span>
              <h2>Edit Aktivitas</h2>
            </div>

            <form action={updateAction} className="masterForm activityEditForm">
              <label>
                Jenis Aktivitas
                <select name="type" defaultValue={operation.type}>
                  <option>Perawatan</option>
                  <option>Penyemprotan</option>
                  <option>Pemupukan</option>
                  <option>Tenaga Kerja</option>
                  <option>Biaya</option>
                  <option>Lainnya</option>
                </select>
              </label>
              <label>
                Blok
                <select name="block_id" defaultValue={operation.block_id ?? ""}>
                  <option value="">Umum Kebun / tanpa blok</option>
                  {blocks.map((block) => (
                    <option value={block.id} key={block.id}>{block.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Tanggal Aktual
                <input name="op_date" type="date" defaultValue={operation.op_date} required />
              </label>
              <label>
                Pelaksana / Mandor
                <input name="worker" defaultValue={operation.worker ?? ""} />
              </label>
              <label className="fullField">
                Uraian
                <input name="description" defaultValue={operation.description} required />
              </label>
              <label>
                Kuantitas
                <input name="quantity" type="number" min="0" step="0.01" defaultValue={Number(operation.quantity ?? 0)} />
              </label>
              <label>
                Satuan
                <input name="unit" defaultValue={operation.unit ?? ""} />
              </label>
              <label>
                Harga / Satuan
                <input name="unit_price" type="number" min="0" step="1" defaultValue={Number(operation.unit_price ?? 0)} />
              </label>
              <label>
                Dosis / Pohon
                <input name="dose_per_tree" type="number" min="0" step="0.001" defaultValue={Number(operation.dose_per_tree ?? 0)} />
              </label>
              <label>
                HOK
                <input name="labor_days" type="number" min="0" step="0.01" defaultValue={Number(operation.labor_days ?? 0)} />
              </label>
              <label>
                Upah / HOK
                <input name="labor_rate" type="number" min="0" step="1" defaultValue={Number(operation.labor_rate ?? 0)} />
              </label>
              <label className="fullField">
                Catatan
                <textarea name="note" rows={3} defaultValue={operation.note ?? ""} />
              </label>
              <button className="primaryButton fullField" type="submit">
                Simpan Perubahan Actual
              </button>
            </form>
          </section>

          <section className="dangerPanel">
            <div>
              <b>Hapus Actual Direct</b>
              <p>Hanya transaksi DIRECT ini yang dihapus. Master kebun/blok tidak berubah.</p>
            </div>
            <form action={deleteAction}>
              <button className="dangerButton" type="submit">Hapus Aktivitas</button>
            </form>
          </section>
        </>
      ) : (
        <section className="linkedOperationNotice">
          <b>Transaksi ini berasal dari Program/Rencana.</b>
          <p>
            Untuk menjaga integritas Plan → Actual dan biaya, transaksi ini hanya
            dapat dilihat dari modul Aktivitas. Edit/hapus harus dilakukan dari
            modul asal ketika modul tersebut dimigrasikan ke v8.
          </p>
        </section>
      )}
    </div>
  );
}
