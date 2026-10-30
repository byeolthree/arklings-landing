import "@/components/portfolio/portfolio.css";

export default function Loading() {
  return (
    <div className="pf" role="status" aria-live="polite">
      <section className="pf-top">
        <div className="wrap">
          <div className="skel mx-auto h-5 w-40" />
          <div className="skel mx-auto mt-4 h-8 w-72 max-w-full md:h-10" />
        </div>
      </section>
      <section className="pf-list">
        <div className="wrap narrow">
          <ul className="pf-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="panel pf-card">
                <div className="skel h-3 w-16" />
                <div className="skel mt-3 h-6 w-1/2" />
                <div className="skel mt-4 h-4 w-full" />
                <div className="skel mt-2 h-4 w-5/6" />
                <div className="skel mt-6 h-7 w-40" />
              </li>
            ))}
          </ul>
        </div>
      </section>
      <span className="sr-only">불러오는 중…</span>
    </div>
  );
}
