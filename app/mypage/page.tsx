import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { DisplayNameForm } from "@/components/mypage-forms";
import { PaperCard, PaperPage, outlineBtn } from "@/components/paper-card";
import { requireUser } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/server";
import { formatKst } from "@/lib/time";

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

  // 내 기획안 목록(내 것만). 불러오지 못해도 마이페이지의 다른 부분은 그대로 보여 준다.
  type PlanRow = { id: string; title: string; is_public: boolean; updated_at: string };
  let plans: PlanRow[] = [];
  let plansLoadFailed = false;
  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase
      .from("plans")
      .select("id, title, is_public, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(30);
    if (error) plansLoadFailed = true;
    else plans = (data ?? []) as PlanRow[];
  } catch {
    plansLoadFailed = true;
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

        <section className="mt-8 border-t border-[#e8dfe3] pt-6" aria-labelledby="my-plans">
          <div className="flex items-center justify-between gap-3">
            <h2 id="my-plans" className="text-[16px] font-bold text-[#292126]">
              내 기획안
            </h2>
            <Link href="/planner" className={outlineBtn}>
              새 기획안 쓰기
            </Link>
          </div>
          {plansLoadFailed ? (
            <p role="alert" className="mt-3 text-[13px] text-destructive">
              기획안 목록을 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.
            </p>
          ) : plans.length === 0 ? (
            <p className="mt-3 text-[13px] text-[#574a4f]">아직 저장한 기획안이 없어요. 기획안 화면에서 「임시저장」을 누르면 여기에 나타나요.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[#e8dfe3] border-y border-[#e8dfe3]">
              {plans.map((p) => (
                <li key={p.id}>
                  <Link href={`/planner?plan=${p.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 hover:bg-[#f5ecf0]">
                    <span className="min-w-0 break-words text-[14px] font-medium text-[#292126]">{p.title}</span>
                    <span className="flex items-center gap-2 text-[12px] text-[#574a4f]">
                      <span className={`rounded-full px-2 py-0.5 ${p.is_public ? "bg-teal text-white" : "bg-[#f5ecf0] text-[#292126]"}`}>
                        {p.is_public ? "공개 중" : "비공개"}
                      </span>
                      {formatKst(p.updated_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form action={signOut} className="mt-8 border-t border-[#e8dfe3] pt-6">
          <button type="submit" className={outlineBtn}>
            로그아웃
          </button>
        </form>

        <p className="mt-6 text-[12px] text-[#574a4f]">
          더 이상 쓰지 않으신다면{" "}
          <Link href="/mypage/withdraw" className="underline hover:text-jaju">
            회원 탈퇴
          </Link>
          를 할 수 있어요.
        </p>
      </PaperCard>
    </PaperPage>
  );
}
