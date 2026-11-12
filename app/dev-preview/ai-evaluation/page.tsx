import type { Metadata } from "next";
import Link from "next/link";
import { EvalPreview } from "./preview";
import { EVAL_STATES } from "./states";

// 디자인 확인용 샘플 미리보기(AI 평가 패널). 서버·AI를 부르지 않는다. 상단 메뉴·기획안 화면에는 잇지 않았다. 디자인이 끝나면 지운다.
export const metadata: Metadata = { title: "AI 평가 패널 샘플 미리보기", robots: { index: false, follow: false } };

export default async function AiEvaluationPreviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.state) ? sp.state[0] : sp.state;
  const key = raw && raw in EVAL_STATES ? raw : "ready";
  return (
    <>
      <details className="mx-auto mt-6 w-full max-w-[720px] px-4 text-[11px] leading-snug text-[#2a2025]">
        <summary className="cursor-pointer">미리보기 도우미 (사이트에 없는 상자) — 상태 고르기</summary>
        <p className="mt-2 rounded-lg border border-[#e8dfe3] bg-white px-3 py-2">
          가짜 결과만 나와요.{" "}
          {Object.entries(EVAL_STATES).map(([k, label], i) => (
            <span key={k}>
              {i > 0 && " · "}
              <Link href={`/dev-preview/ai-evaluation?state=${k}`} className={k === key ? "font-bold underline" : "underline"}>
                {label}
              </Link>
            </span>
          ))}
        </p>
      </details>
      <EvalPreview key={key} state={key} />
    </>
  );
}
