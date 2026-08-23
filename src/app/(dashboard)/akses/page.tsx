export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccess } from "@/lib/auth/access";
import { assignMemberAccess } from "@/features/access/actions";
import { AppIcon } from "@/components/layout/app-icons";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const access = await getCurrentAccess();
  if (!access || access.role !== "owner") redirect("/");

  const supabase = await createClient();
  const [estateResult, memberResult] = await Promise.all([
    supabase.from("estates").select("id,name").order("name"),
    supabase.rpc("spn_list_workspace_members"),
  ]);
  if (estateResult.error) throw new Error(estateResult.error.message);
  if (memberResult.error) throw new Error(memberResult.error.message);

  const estates = estateResult.data ?? [];
  const members = memberResult.data ?? [];

  return <div className="accessPage">
    <section className="accessHero">
      <div><span>ROLE ACCESS CONTROL</span><h1>Akses Pengguna</h1><p>Atur siapa yang dapat mengakses kebun. Mode Pemanen dibatasi khusus untuk pencatatan hasil panen pada kebun yang ditugaskan.</p></div>
      <i><AppIcon name="user" /></i>
    </section>

    {params.status === "saved" ? <div className="activityNotice">Akses pengguna berhasil diperbarui.</div> : null}

    <section className="accessGrid">
      <article className="accessPanel">
        <span>TAMBAH / UBAH AKSES</span><h2>Tugaskan Pengguna</h2>
        <p className="muted">Email harus sudah terdaftar pada Supabase Authentication. Password tidak pernah disimpan di modul ini.</p>
        <form action={assignMemberAccess} className="masterForm">
          <label className="fullField">Email pengguna<input name="email" type="email" placeholder="pemanen@contoh.com" required /></label>
          <label>Role<select name="role" defaultValue="pemanen"><option value="pemanen">Pemanen</option><option value="mandor">Mandor</option><option value="admin">Admin</option><option value="viewer">Viewer</option></select></label>
          <label>Kebun tugas<select name="estate_id" defaultValue=""><option value="">Semua / tidak dibatasi</option>{estates.map(e=><option value={e.id} key={e.id}>{e.name}</option>)}</select></label>
          <div className="accessHint fullField"><b>Mode Pemanen</b><span>Wajib memilih satu kebun. Pemanen hanya dapat membuka Panen dan menyimpan transaksi DIRECT; edit/delete diblokir.</span></div>
          <button className="primaryButton fullField" type="submit">Simpan Akses</button>
        </form>
      </article>

      <article className="accessPanel">
        <span>PENGGUNA AKTIF</span><h2>Daftar Akses</h2>
        <div className="accessMemberList">
          {members.map(member=>{
            const estate=estates.find(e=>e.id===member.estate_id);
            return <div key={member.id}><i>{member.email.slice(0,1).toUpperCase()}</i><span><b>{member.email}</b><small>{estate?.name ?? "Semua Kebun"}</small></span><em>{member.role}</em></div>;
          })}
          {!members.length ? <div className="emptyState">Belum ada anggota workspace yang ditugaskan.</div> : null}
        </div>
      </article>
    </section>
  </div>;
}
