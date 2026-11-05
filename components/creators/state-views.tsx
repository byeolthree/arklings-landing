import Link from "next/link";
import "./creators.css";

// 크리에이터 화면의 상태 화면(404, 불러오는 중). 오류 화면은 다시 시도 버튼 때문에 error-view.tsx에 따로 둔다.
// 404는 오류 화면이라 무슨 일인지 알려 주는 제목을 둔다. 불러오는 중 화면에는 제목을 두지 않는다.

export function NotFoundView({ title, text, href, label }: { title: string; text: string; href: string; label: string }) {
  return (
    <div className="cr">
      <section className="cr-list">
        <div className="wrap cr-state-wrap">
          <div className="panel cr-state">
            <h1>{title}</h1>
            <p>{text}</p>
            <Link href={href} className="btn btn-primary">
              {label} <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const Skel = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => <div className={`skel ${className}`} style={style} />;

function CardSkeleton() {
  return (
    <li className="panel cr-card" aria-hidden="true">
      <div className="cr-who">
        <Skel className="cr-skel-av" />
        <div className="cr-who-text" style={{ gap: 8, flex: 1 }}>
          <Skel style={{ height: 14, width: "55%" }} />
          <Skel style={{ height: 12, width: "80%" }} />
        </div>
      </div>
      <Skel className="cr-skel-box" />
      <Skel style={{ height: 24, width: 72, borderRadius: 999 }} />
    </li>
  );
}

export function CreatorListSkeleton() {
  return (
    <div className="cr" role="status" aria-live="polite">
      <section className="cr-top">
        <div className="wrap">
          <Skel style={{ height: 30, width: "min(320px, 80%)", margin: "0 auto" }} />
          <Skel style={{ height: 16, width: "min(420px, 90%)", margin: "14px auto 0" }} />
        </div>
      </section>
      <section className="cr-list">
        <div className="wrap">
          <div className="cr-tools">
            <div className="cr-toolbar">
              <Skel style={{ height: 44, width: "100%", borderRadius: 999 }} />
            </div>
          </div>
          <ul className="cr-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </ul>
        </div>
      </section>
      <span className="sr-only">불러오는 중…</span>
    </div>
  );
}

export function CreatorProfileSkeleton() {
  return (
    <div className="cr" role="status" aria-live="polite">
      <section className="cr-list cr-prof">
        <div className="wrap">
          <Skel style={{ height: 14, width: 88 }} />
          <div className="cr-prof-head" aria-hidden="true">
            <Skel className="cr-skel-av cr-skel-av-lg" />
            <div className="cr-prof-text" style={{ flex: 1 }}>
              <Skel style={{ height: 28, width: "min(200px, 60%)" }} />
              <Skel style={{ height: 24, width: "min(260px, 80%)", borderRadius: 999 }} />
              <Skel style={{ height: 14, width: "min(420px, 90%)" }} />
            </div>
          </div>
          <div className="cr-sec-head">
            <Skel style={{ height: 20, width: 96 }} />
          </div>
          <ul className="cr-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="panel cr-plan" aria-hidden="true">
                <Skel className="cr-skel-box" />
                <Skel style={{ height: 12, width: 120 }} />
              </li>
            ))}
          </ul>
        </div>
      </section>
      <span className="sr-only">불러오는 중…</span>
    </div>
  );
}

export function PlanDetailSkeleton() {
  return (
    <div className="cr" role="status" aria-live="polite">
      <section className="cr-list cr-prof">
        <div className="wrap cr-narrow">
          <Skel style={{ height: 14, width: 140 }} />
          <div className="cr-d-head" aria-hidden="true">
            <Skel style={{ height: 36, width: "min(420px, 80%)" }} />
            <Skel style={{ height: 24, width: "min(240px, 70%)" }} />
          </div>
          <div className="panel cr-doc" aria-hidden="true">
            <Skel style={{ height: 12, width: 56 }} />
            <Skel style={{ height: 20, width: "100%", marginTop: 14 }} />
            <Skel style={{ height: 20, width: "80%", marginTop: 8 }} />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skel key={i} style={{ height: 14, width: "100%", marginTop: 26 }} />
            ))}
            <div style={{ height: 24 }} />
          </div>
        </div>
      </section>
      <span className="sr-only">불러오는 중…</span>
    </div>
  );
}
