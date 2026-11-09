import { STATUSES, type Status } from "@/lib/collab";

// 협업 신청 상태 색: 한 곳에서 정해 받은 신청 목록·상세·마이페이지가 같이 쓴다(디자인 토큰 AGENTS.md의 역할에 맞춤, 별뜨리님 지시 2026-11-09).
// 접수=정보(#2463A7), 검토 중=accent/gold(#D89A24, 어두운 글자 #2A2025), 수락=성공(#16794B), 거절=오류(#C83A3A). 글자는 흰색(검토 중만 어두운 글자).
const TONE: Record<Status, string> = {
  received: "border border-info bg-info text-white",
  reviewing: "border border-gold bg-gold text-title",
  accepted: "border border-[#16794b] bg-[#16794b] text-white",
  rejected: "border border-[#c83a3a] bg-[#c83a3a] text-white",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium ${TONE[status]}`}>
      {STATUSES[status]}
    </span>
  );
}
