import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/(auth)/login/actions";

export function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="appShell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brandIcon">🌴</span>
          <span>
            <b><i>Sawit</i>ProNesia</b>
            <small>Kelola Kebun, Maksimalkan Hasil</small>
          </span>
        </Link>

        <div className="topbarRight">
          <span className="versionPill">v8.3</span>
          <span className="cloudPill">● Cloud</span>
          <form action={logout}>
            <button className="accountButton" type="submit" title="Keluar">♙</button>
          </form>
        </div>
      </header>

      <nav className="mainNav">
        <Link href="/">🏠 <span>Home</span></Link>
        <Link href="/kebun">🌴 <span>Kebun</span></Link>
        <Link href="/aktivitas">＋ <span>Aktivitas</span></Link>
        <span className="disabledNav">📋 <span>Laporan</span></span>
        <span className="disabledNav">📊 <span>Analytics</span></span>
      </nav>

      <main className="content">{children}</main>
    </div>
  );
}
