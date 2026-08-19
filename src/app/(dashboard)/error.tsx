"use client";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("SawitProNesia dashboard error", error);
  }, [error]);

  return (
    <section className="runtimeError">
      <span>⚠️</span>
      <h1>Halaman belum dapat dimuat</h1>
      <p>
        Data Anda tidak dihapus. Coba muat ulang halaman. Jika tetap terjadi,
        cek deployment log Cloudflare.
      </p>
      <button onClick={() => reset()}>Coba Lagi</button>
      {error.digest ? <small>Error ID: {error.digest}</small> : null}
    </section>
  );
}
