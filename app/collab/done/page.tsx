import type { Metadata } from "next";
import Link from "next/link";
import { PaperCard, PaperPage, primaryBtn } from "@/components/paper-card";

export const metadata: Metadata = { title: "신청이 접수됐습니다" };

// 신청자는 로그인을 하지 않으므로 접수 뒤에는 신청 내용을 다시 볼 수 없다. 접수 안내만 보여 준다.
export default function DonePage() {
  return (
    <PaperPage>
      <PaperCard className="flex flex-col items-center gap-5 !px-6 !py-12 md:!px-14 md:!py-16">
        <div className="grid size-[64px] place-items-center rounded-full bg-jaju text-[28px] font-bold text-white md:size-[64px]" aria-hidden>
          ✓
        </div>
        <h1 className="text-[22px] font-bold text-[#292126]">신청이 접수됐습니다</h1>
        <p className="text-center text-[13px] leading-normal text-[#574a4f]">
          <span className="block">검토 후 남겨주신 연락처로 안내드릴게요.</span>
        </p>
        <div className="mt-2 flex gap-3">
          <Link href="/" className={primaryBtn}>
            홈으로
          </Link>
        </div>
      </PaperCard>
    </PaperPage>
  );
}
