import { PaperPage } from "@/components/paper-card";

export default function Loading() {
  return (
    <PaperPage wide>
      <div role="status" aria-live="polite" className="space-y-3 rounded-2xl border border-[#e6e6e6] bg-white p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[#e8dfe3]" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-[#e8dfe3]/70" />
        ))}
        <span className="sr-only">불러오는 중…</span>
      </div>
    </PaperPage>
  );
}
