import type { Metadata } from "next";
import { AlertPopup } from "@/components/ui/alert-popup";
import { redirect } from "next/navigation";
import "@/components/planner/planner.css";
import "@/components/mypage/mypage.css";
import "@/components/register/register.css";
import { CreatorProfileForm } from "@/components/mypage/creator-forms";
import { RegisterHeader } from "@/components/register/register-steps";
import { RegisterScreen } from "@/components/register/register-screen";
import { requireUser } from "@/lib/auth";
import { loadMyCreator, type MyCreatorData } from "@/lib/creators-mine";
import { createAuthClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "포트폴리오 등록", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// 독립 포트폴리오 등록 화면(시안 01). 상단 메뉴 ＋·사람 아이콘의 「포트폴리오 등록」이 여는 곳이다.
// 순서: 로그인·가입 → 이메일 확인(requireUser가 먼저 거른다) → 프로필 등록(프로필이 없을 때만) → 포트폴리오 등록. 저장은 마이페이지와 같은 Server Action이 한다.
export default async function PortfolioNewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/portfolio/new");
  const sp = await searchParams;
  const workParam = typeof sp.work === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sp.work) ? sp.work : null;

  let data: MyCreatorData | null = null;
  try {
    data = await loadMyCreator(user.id);
  } catch {
    data = null;
  }
  let nickname = "";
  try {
    const { data: row } = await (await createAuthClient()).from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    nickname = (row as { display_name?: string } | null)?.display_name ?? "";
  } catch {
    nickname = "";
  }

  if (!data) {
    return (
      <div className="mp rg">
        <RegisterHeader current="포트폴리오 등록" />
        <div className="rg-main">
          <div className="rg-wrap">
            <AlertPopup>불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.</AlertPopup>
          </div>
        </div>
      </div>
    );
  }

  // 프로필이 없으면 처음부터 프로필 단계 주소(?step=profile)에 둔다. 저장하면 서버가 화면을 다시 읽는데, 주소가 그대로여야 「저장했어요」 안내 창이 있는 이 화면이 사라지지 않는다.
  if (!data.profile && sp.step !== "profile") redirect("/portfolio/new?step=profile");

  if (!data.profile || sp.step === "profile") {
    return (
      <div className="mp rg">
        <RegisterHeader current="프로필 등록" />
        <div className="rg-prof">
          <div className="rg-wrap rg-prof-wrap">
            <div className="rg-prof-card mp-card">
              <CreatorProfileForm profile={data.profile} workCount={data.works.length} showSaved={sp.saved === "1"} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mp rg">
      <RegisterHeader current="포트폴리오 등록" />
      <div className="rg-main">
        <div className="rg-wrap">
          <RegisterScreen works={data.works} usedBytes={data.usedBytes} nickname={nickname} openWorkId={workParam} openNew={sp.new === "1"} profileRoles={data.profile.roles} profilePublic={data.profile.isPublic} profileBio={data.profile.bio} profileOpen={data.profile.openToCollab} />
        </div>
      </div>
    </div>
  );
}
