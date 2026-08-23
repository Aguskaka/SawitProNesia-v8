export default function DashboardLoading() {
  return (
    <section className="dashboardLoading" aria-live="polite" aria-busy="true">
      <div className="loadingHero skeletonPulse" />
      <div className="loadingKpis">
        {Array.from({ length: 4 }, (_, index) => <div className="loadingCard skeletonPulse" key={index} />)}
      </div>
      <div className="loadingPanels">
        <div className="loadingPanel skeletonPulse" />
        <div className="loadingPanel skeletonPulse" />
      </div>
      <span className="loadingLabel">Memuat data kebun…</span>
    </section>
  );
}
