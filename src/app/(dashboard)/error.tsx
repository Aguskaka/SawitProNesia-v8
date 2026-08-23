"use client";
import { useEffect } from "react";
import { AppIcon } from "@/components/layout/app-icons";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void; }) {
  useEffect(() => { console.error("SawitProNesia dashboard error", error); }, [error]);

  return (
    <section className="runtimeError" role="alert">
      <i><AppIcon name="activity" /></i>
      <small>SYSTEM NOTICE</small>
      <h1>Halaman belum dapat dimuat</h1>
      <p>Data Anda tetap tersimpan. Coba muat ulang halaman. Jika masalah berulang, periksa deployment log Cloudflare.</p>
      <button type="button" onClick={() => reset()}>Coba Lagi</button>
      {error.digest ? <code>Error ID: {error.digest}</code> : null}
    </section>
  );
}
