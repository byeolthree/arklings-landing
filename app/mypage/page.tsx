import type { Metadata } from "next";
import { signOut } from "@/app/actions/auth";
import { DisplayNameForm } from "@/components/mypage-forms";
import { PaperCard, PaperPage, outlineBtn } from "@/components/paper-card";
import { requireUser } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "마이페이지", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PROVIDER_LABEL: Record<string, string> = {
  email: "이메일·비밀번호",
  google: "구글",
  kakao: "카카오",
};

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr]">
      <dt className="text-[13px] text-[#574a4f]">{k}</dt>
      <dd className="text-[14px] text-[#292126]">{children}</dd>
    </div>
  );
}

export default async function MyPage() {
  const user = await requireUser("/mypage");

  let displayName = "";
  let profileLoadFailed = false;
  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    if (error) profileLoadFailed = true;
    else displayName = data?.display_name ?? "";
  } catch {
    profileLoadFailed = true;
  }

  const methods = user.providers.map((p) => PROVIDER_LABEL[p] ?? p);

  return (
    <PaperPage wide>
      <PaperCard className="!px-5 md:!p-10">
        <h1 className="text-[20px] font-bold text-[#292126] md:text-[24px]">마이페이지</h1>

        <dl className="mt-4 divide-y divide-[#e8dfe3] border-y border-[#e8dfe3]">
          <Row k="로그인 방법">{methods.length > 0 ? methods.join(" · ") : "-"}</Row>
          <Row k="내 이메일">
            <span className="break-all">{user.email ?? "-"}</span>
            <span className="mt-0.5 block text-[12px] text-[#8c8c8c]">이 주소는 나에게만 보여요.</span>
          </Row>
        </dl>

        <div className="mt-6">
          {profileLoadFailed ? (
            <p role="alert" className="text-[13px] text-destructive">
              프로필을 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.
            </p>
          ) : (
            <DisplayNameForm initial={displayName} />
          )}
        </div>

        <form action={signOut} className="mt-8 border-t border-[#e8dfe3] pt-6">
          <button type="submit" className={outlineBtn}>
            로그아웃
          </button>
        </form>
      </PaperCard>
    </PaperPage>
  );
}
