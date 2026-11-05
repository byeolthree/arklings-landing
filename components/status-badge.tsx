import { STATUSES, type Status } from "@/lib/collab";

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium bg-jaju text-white`}>
      {STATUSES[status]}
    </span>
  );
}
