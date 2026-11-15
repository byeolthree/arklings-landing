import type { CollabTarget, CollabRequest } from "@/lib/collab";

// 협업 신청 상세의 줄 하나(왼쪽 이름표, 오른쪽 내용). 받은 신청(/collab/[id])과 보낸 신청(/mypage/collab/[id])이 같은 모양을 쓴다.
export function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr]">
      <dt className="text-[13px] text-[#574a4f]">{k}</dt>
      <dd className="text-[14px] text-[#292126]">{children}</dd>
    </div>
  );
}

// 「신청 대상」 줄: 기획안 → 작품 → 크리에이터 → 아클링스 앞 일반 신청 순서로 하나만 보인다(lib/collab.ts collabTargetOf의 종류를 따른다).
export function CollabTargetRow({ r, target }: { r: Pick<CollabRequest, "plans" | "work_title" | "source_works">; target: CollabTarget }) {
  if (target.kind === "plan") return <Row k="신청 기획안">{r.plans?.title ?? "제목을 불러오지 못했어요"}</Row>;
  if (target.kind === "work") return <Row k="신청 작품">{r.work_title}</Row>;
  if (target.kind === "creator") return <Row k="신청 크리에이터">{target.text}</Row>;
  return <Row k="신청 대상">{r.source_works?.title ?? "특정 이야기 아님 (전체적인 협업 제안)"}</Row>;
}
