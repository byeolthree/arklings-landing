import type { Metadata } from "next";
import Link from "next/link";
import { PaperCard, PaperPage, primaryBtn } from "@/components/paper-card";

export const metadata: Metadata = { title: "탈퇴가 끝났어요", robots: { index: false, follow: false } };

export default function WithdrawnPage() {
  return (
    <PaperPage>
      <PaperCard>
        <h1 className="text-[20px] font-bold text-[#292126] md:text-[24px]">탈퇴가 끝났어요</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[#574a4f]">
          계정과 기획안이 모두 삭제됐어요. 그동안 함께해 주셔서 고마워요. 언제든 다시 가입할 수 있어요.
        </p>
        <div className="mt-6">
          <Link href="/" className={primaryBtn}>
            홈으로
          </Link>
        </div>
      </PaperCard>
    </PaperPage>
  );
}
