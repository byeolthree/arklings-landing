import Link from "next/link";

// 등록 흐름의 단계 칩(시안 01): 로그인·가입 → 이메일 확인 → 프로필 등록 → 포트폴리오 등록. 지금 단계만 진하게 칠한다.
const STEPS = ["로그인·가입", "이메일 확인", "프로필 등록", "포트폴리오 등록"] as const;
export type Step = (typeof STEPS)[number];

export function RegisterHeader({ title, current, hrefs }: { title: string; current: Step; hrefs?: Partial<Record<Step, string>> }) {
  return (
    <div className="rg-top">
      <div className="rg-wrap">
        <h1 className="rg-title">{title}</h1>
        <p className="rg-desc">〈설명 문구〉</p>
        <ol className="rg-steps" aria-label="등록 순서">
          {STEPS.map((s) => {
            const href = hrefs?.[s];
            return (
              <li key={s} aria-current={s === current ? "step" : undefined}>
                {href && s !== current ? <Link href={href}>{s}</Link> : s}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
