import { STATUSES, type Status } from "@/lib/collab";

// 접수·수락은 자주색 채움(흰 글씨), 검토 중은 자주색 외곽선과 글씨, 거절은 회색 외곽선과 회색 태그.
const TONE: Record<Status, string> = {
  received: "border border-jaju bg-jaju text-white",
  reviewing: "border border-jaju bg-transparent text-jaju",
  accepted: "border border-jaju bg-jaju text-white",
  rejected: "border border-[#cfc4ca] bg-[#e8dfe3] text-title",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium ${TONE[status]}`}>
      {STATUSES[status]}
    </span>
  );
}
