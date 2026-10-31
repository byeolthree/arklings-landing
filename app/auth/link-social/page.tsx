import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { dismissSocialLink, finishSocialLink } from "@/app/actions/social";
import { CardHeading, PaperCard, PaperPage, outlineBtn, primaryBtn } from "@/components/paper-card";
import { getCurrentUser } from "@/lib/auth";
import { PROVIDER_LABEL } from "@/lib/providers";
import { findPendingLink } from "@/lib/social-link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKst } from "@/lib/time";

export const metadata: Metadata = { title: "로그인 방법 이어주기", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// 이메일 확인 링크를 누르고 들어온 사람에게, 소셜 로그인을 이 계정에 이어 줄지 직접 승인받는 화면.
export default async function LinkSocialPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fauth%2Flink-social");
  if (!user.email) redirect("/mypage");

  let pending = null;
  let nickname = "";
  try {
    pending = await findPendingLink(user.email);
    if (pending) {
      const { data } = await createAdminClient().from("profiles").select("display_name").eq("id", pending.sourceUserId).maybeSingle();
      nickname = data?.display_name ?? "";
    }
  } catch {
    pending = null;
  }
  if (!pending) redirect("/mypage");

  const label = PROVIDER_LABEL[pending.provider] ?? pending.provider;
  return (
    <PaperPage>
      <PaperCard>
        <CardHeading title={`${label} 로그인을 이 계정에 이어 줄까요?`} lines={[`${user.email} 계정으로 로그인됐어요.`]} />
        <div className="mt-6 flex flex-col gap-4 md:mt-8">
          <dl className="rounded-lg bg-[#faf7f8] px-4 py-3 text-[13px] text-[#292126]">
            <div className="flex justify-between gap-3 py-1">
              <dt className="text-[#574a4f]">요청한 {label} 계정</dt>
              <dd className="font-medium break-all">{nickname || "(이름 없음)"}</dd>
            </div>
            <div className="flex justify-between gap-3 py-1">
              <dt className="text-[#574a4f]">요청한 시각</dt>
              <dd>{formatKst(pending.createdAt)}</dd>
            </div>
          </dl>
          <p className="rounded-lg border border-[#d89a24] bg-[#fdf6e7] px-3 py-2 text-[12px] leading-normal text-[#292126] md:text-[13px]">
            방금 내가 {label}로 가입하면서 이 이메일을 입력한 게 맞을 때만 이어 주세요. 본인이 아니라면 아래 「이어 주지 않기」를 눌러 주세요.
            이어 주면 {label}로도 이 계정에 로그인할 수 있게 돼요.
          </p>
          <form action={finishSocialLink}>
            <button type="submit" className={`${primaryBtn} w-full`}>
              {label} 로그인을 이 계정에 이어 주기
            </button>
          </form>
          <form action={dismissSocialLink}>
            <button type="submit" className={`${outlineBtn} w-full`}>
              이어 주지 않기
            </button>
          </form>
          <Link href="/mypage" className="text-center text-[12px] text-[#6f6469]">
            나중에 하기
          </Link>
        </div>
      </PaperCard>
    </PaperPage>
  );
}
