import type { Metadata } from "next";
import Link from "next/link";
import { WithdrawForm } from "@/components/withdraw-form";
import { PaperCard, PaperPage, outlineBtn } from "@/components/paper-card";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "회원 탈퇴", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function WithdrawPage() {
  await requireUser("/mypage/withdraw");
  return (
    <PaperPage wide>
      <PaperCard className="!px-5 md:!p-10">
        <h1 className="text-[20px] font-bold text-[#292126] md:text-[24px]">회원 탈퇴</h1>
        <p className="mt-2 text-[13px] text-[#574a4f]">탈퇴하면 아래 내용이 바로 지워지고 되돌릴 수 없어요.</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[14px] text-[#292126]">
          <li>계정(로그인 정보)과 공개 이름, 개인정보 동의 기록이 삭제돼요.</li>
          <li>내가 쓴 기획안과 임시저장 이력이 모두 삭제돼요. 공개해 둔 기획안도 함께 사라져요.</li>
          <li>PDF 메일 받기 횟수 기록도 삭제돼요.</li>
          <li>
            내 기획안을 보고 온 협업 신청은 받는 사람이 없어져 아무도 볼 수 없게 돼요. 접수한 날부터 3개월이 지나면 자동으로 삭제돼요.
          </li>
          <li>이미 내려받거나 메일로 받은 PDF 파일은 그대로 남아 있어요.</li>
        </ul>
        <WithdrawForm />
        <div className="mt-6 border-t border-[#e8dfe3] pt-5">
          <Link href="/mypage" className={outlineBtn}>
            그만두고 마이페이지로
          </Link>
        </div>
      </PaperCard>
    </PaperPage>
  );
}
