import type { Metadata } from "next";
import Link from "next/link";
import { PaperCard, PaperPage, primaryBtn } from "@/components/paper-card";
import { UUID_RE } from "@/lib/collab";

export const metadata: Metadata = { title: "신청이 접수됐습니다" };

export default async function DonePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).id;
  const id = typeof raw === "string" && UUID_RE.test(raw) ? raw : null;
  return (
    <PaperPage>
      <PaperCard className="flex flex-col items-center gap-5 !px-6 !py-12 md:!px-14 md:!py-16">
        <div className="grid size-[64px] place-items-center rounded-full bg-jaju text-[28px] font-bold text-white md:size-[64px]" aria-hidden>
          ✓
        </div>
        <h1 className="text-[22px] font-bold text-[#292126]">신청이 접수됐습니다</h1>
        <p className="text-center text-[13px] leading-normal text-[#574a4f]">
          <span className="block">검토 후 남겨주신 연락처로 안내드릴게요.</span>
          <span className="block">신청 내용 화면에서도 진행 상황을 확인하실 수 있습니다.</span>
        </p>
        <div className="mt-2 flex gap-3">
          <Link href={id ? `/collab/${id}` : "/collab"} className={primaryBtn}>
            신청 내용 보기
          </Link>
        </div>
      </PaperCard>
    </PaperPage>
  );
}
