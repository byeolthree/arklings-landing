import Link from "next/link";
import "./ai.css";

// 시안의 오류 안내 카드: 위에 회색 라벨 알약, 느낌표 원형 아이콘, 굵은 제목, 설명, (있으면) 단추.
export type ErrorAction = { label: string; kind: "primary" | "line"; href?: string; onClick?: () => void };

export function ErrorCard({ pill, title, desc, action }: { pill: string; title: string; desc: string; action?: ErrorAction }) {
  return (
    <div className="ai-err" role="alert">
      <span className="ai-err-pill">{pill}</span>
      <div className="ai-err-body">
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" style={{ flex: "none" }}>
          <circle cx="14" cy="14" r="14" fill="#f6e8ef" />
          <path d="M14 8v7" stroke="#a61e5c" strokeWidth="2" strokeLinecap="round" />
          <circle cx="14" cy="19.5" r="1.3" fill="#a61e5c" />
        </svg>
        <div>
          <div className="ai-err-title">{title}</div>
          <p className="ai-err-desc">{desc}</p>
        </div>
      </div>
      {action &&
        (action.href ? (
          <Link href={action.href} className={`ai-btn sm${action.kind === "line" ? " line" : ""}`}>
            {action.label}
          </Link>
        ) : (
          <button type="button" className={`ai-btn sm${action.kind === "line" ? " line" : ""}`} onClick={action.onClick}>
            {action.label}
          </button>
        ))}
    </div>
  );
}
