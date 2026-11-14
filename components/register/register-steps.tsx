import Link from "next/link";

// 마이페이지 네 화면의 맨 위 띠(시안 01·12·13, D39·D42): 제목은 늘 「마이페이지」, 칩 이름은 「기본 정보 · 프로필 등록 · 포트폴리오 등록 · 협업 신청」이다.
// 지금 화면의 칩만 진하게 칠하고, 나머지는 누르면 그 화면으로 간다.
const STEPS = ["기본 정보", "프로필 등록", "포트폴리오 등록", "협업 신청"] as const;
export type Step = (typeof STEPS)[number];

const HREFS: Record<Step, string> = {
  "기본 정보": "/mypage",
  "프로필 등록": "/portfolio/new?step=profile",
  "포트폴리오 등록": "/portfolio/new",
  "협업 신청": "/mypage/collab",
};

// 화면에 보이는 칩 이름(「등록」을 뺀다, 2026-11-13 아키텍터 지시)
const LABEL: Record<Step, string> = { "기본 정보": "기본 정보", "프로필 등록": "프로필", "포트폴리오 등록": "포트폴리오", "협업 신청": "협업 신청" };

export function RegisterHeader({ current }: { title?: string; current: Step }) {
  return (
    <div className="rg-top">
      <div className="rg-wrap">
        <h1 className="rg-title">마이 페이지</h1>
        <ol className="rg-steps" aria-label="마이페이지 이동">
          {/* 번호 + 밑줄 탭(2026-11-14 아키텍터 승인 시안 tabs2): 지금 화면은 번호 자주색, 글자 제목색 굵게, 자주색 밑줄 */}
          {STEPS.map((s, i) => {
            const label = (
              <>
                <span className="rg-step-no">{String(i + 1).padStart(2, "0")}</span>
                {LABEL[s]}
              </>
            );
            return (
              <li key={s} aria-current={s === current ? "step" : undefined}>
                {s === current ? label : <Link href={HREFS[s]}>{label}</Link>}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
