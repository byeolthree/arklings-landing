import "./landing-kit.css";

// 랜딩(public/landing.html)의 부품을 그대로 옮긴 공용 부품. 모양은 landing-kit.css 한 곳에서만 정한다.

// 화면 틀: 옅은 띠(제목·한 줄 설명) + 본문 자리. 모든 새 화면이 이 틀을 쓴다.
export function LkPage({ title, lead, kicker, children }: { title: string; lead?: string; kicker?: string; children: React.ReactNode }) {
  return (
    <div className="lk-page">
      <section className="lk-band">
        <div className="lk-wrap">
          {kicker && <p className="lk-kicker">{kicker}</p>}
          <h1 className="lk-title">{title}</h1>
          {lead && <p className="lk-lead">{lead}</p>}
        </div>
      </section>
      <section className="lk-section">
        <div className="lk-wrap">{children}</div>
      </section>
    </div>
  );
}

export function LkCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`lk-card ${className}`.trim()}>{children}</div>;
}

// 입력 칸 하나(이름표 + 칸 + 안내 + 오류). 오류 문구는 칸 아래에 보인다.
export function LkField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="lk-field">
      <label htmlFor={id} className="lk-label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="lk-note">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="lk-error">
          {error}
        </p>
      )}
    </div>
  );
}
