import type { Metadata } from "next";
import Link from "next/link";
import { CardHeading, PaperCard, PaperPage, outlineBtn, primaryBtn } from "@/components/paper-card";
import { SubmitButton } from "@/components/submit-button";

// 디자인 확인용 샘플 미리보기. 실제 계정·DB와 연결되지 않는다(버튼은 2초 기다린 뒤 아무 일도 하지 않는다). 디자인이 끝나면 지운다.
export const metadata: Metadata = { title: "로그인 방법 이어주기 샘플 미리보기", robots: { index: false, follow: false } };

async function fakeAction() {
  "use server";
  await new Promise((r) => setTimeout(r, 2000));
}

export default function LinkSocialPreviewPage() {
  const label = "카카오";
  return (
    <PaperPage>
      <PaperCard>
        <CardHeading title={`${label} 로그인을 이 계정에 이어 줄까요?`} lines={["sample@example.com 계정으로 로그인됐어요."]} />
        <div className="mt-6 flex flex-col gap-4 md:mt-8">
          <dl className="rounded-lg bg-[#faf7f8] px-4 py-3 text-[13px] text-[#292126]">
            <div className="flex justify-between gap-3 py-1">
              <dt className="text-[#574a4f]">요청한 {label} 계정</dt>
              <dd className="font-medium break-all">샘플 카카오 계정</dd>
            </div>
            <div className="flex justify-between gap-3 py-1">
              <dt className="text-[#574a4f]">요청한 시각</dt>
              <dd>2026. 11. 06. 02:00 KST</dd>
            </div>
          </dl>
          <p className="rounded-lg border border-[#d89a24] bg-[#fdf6e7] px-3 py-2 text-[12px] leading-normal text-[#292126] md:text-[13px]">
            방금 내가 {label}로 가입하면서 이 이메일을 입력한 게 맞을 때만 이어 주세요. 본인이 아니라면 아래 「이어 주지 않기」를 눌러 주세요.
            이어 주면 {label}로도 이 계정에 로그인할 수 있게 돼요.
          </p>
          <form action={fakeAction}>
            <SubmitButton className={`${primaryBtn} w-full`}>{label} 로그인을 이 계정에 이어 주기</SubmitButton>
          </form>
          <form action={fakeAction}>
            <SubmitButton className={`${outlineBtn} w-full`}>이어 주지 않기</SubmitButton>
          </form>
          <Link href="/mypage" className="text-center text-[12px] text-[#6f6469]">
            나중에 하기
          </Link>
        </div>
      </PaperCard>
    </PaperPage>
  );
}
