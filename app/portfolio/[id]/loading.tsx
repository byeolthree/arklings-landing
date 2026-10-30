import "@/components/portfolio/portfolio.css";

export default function Loading() {
  return (
    <div className="pf" role="status" aria-live="polite">
      <section className="pf-top">
        <div className="wrap narrow">
          <div className="skel h-4 w-24" />
          <div className="skel mt-6 h-6 w-20" />
          <div className="skel mt-4 h-9 w-2/3 md:h-12" />
          <div className="skel mt-4 h-7 w-48" />
        </div>
      </section>
      <section className="pf-detail-body">
        <div className="wrap narrow">
          <div className="panel pf-doc">
            <div className="skel h-3 w-16" />
            <div className="skel mt-4 h-5 w-full" />
            <div className="skel mt-2 h-5 w-4/5" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skel mt-6 h-4 w-full" />
            ))}
            <div className="h-6" />
          </div>
        </div>
      </section>
      <span className="sr-only">불러오는 중…</span>
    </div>
  );
}
