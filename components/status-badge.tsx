import { STATUSES, type Status } from "@/lib/collab";

// 협업 신청 상태 태그: 색은 이 한 곳에서만 정한다(별뜨리님 지시 D40·D41, 시안 13). 받은 신청·보낸 신청·목록·상세가 모두 이것을 쓴다.
// 금색과 시맨틱 색(정보·성공·오류)은 쓰지 않는다.
//   접수=본문색 #574A50 배경·흰 글자 / 검토 중=자주 #A61E5C 외곽선만·자주 글자 / 수락=자주 배경·흰 글자 / 거절=테두리색 #E8DFE3 배경·연한 회색 #CFC4CA 외곽선·제목색 글자
const TONE: Record<Status, string> = {
  received: "border border-[#574a50] bg-[#574a50] text-white",
  reviewing: "border border-[#a61e5c] bg-transparent text-[#a61e5c]",
  accepted: "border border-[#a61e5c] bg-[#a61e5c] text-white",
  rejected: "border border-[#cfc4ca] bg-[#e8dfe3] text-[#2a2025]",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-block rounded-full px-3 py-[3px] text-[12px] font-medium ${TONE[status]}`}>
      {STATUSES[status]}
    </span>
  );
}
