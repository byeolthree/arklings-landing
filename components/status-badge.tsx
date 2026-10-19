import { STATUSES, type Status } from "@/lib/collab";

const TONE: Record<Status, string> = {
  received: "bg-dusty text-white",
  reviewing: "bg-gold text-title",
  accepted: "bg-sage text-title",
  rejected: "bg-[#e8dfe3] text-title",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium ${TONE[status]}`}>
      {STATUSES[status]}
    </span>
  );
}
