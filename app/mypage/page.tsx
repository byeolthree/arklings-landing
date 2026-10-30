import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { startLinkIdentity, unlinkProvider } from "@/app/actions/social";
import { DisplayNameForm } from "@/components/mypage-forms";
import { PaperCard, PaperPage, outlineBtn } from "@/components/paper-card";
import { requireUser } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/server";
import { OAUTH_PROVIDERS, PROVIDER_LABEL } from "@/lib/providers";
import { formatKst } from "@/lib/time";

export const metadata: Metadata = { title: "마이페이지", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { text: string; ok?: boolean }> = {
  linked: { text: "로그인 방법을 추가했어요.", ok: true },
  unlinked: { text: "로그인 방법을 해제했어요.", ok: true },
  password_set: { text: "비밀번호를 저장했어요. 이제 이메일로도 로그인할 수 있어요.", ok: true },
  link_failed: { text: "로그인 방법을 바꾸지 못했어요. 잠시 뒤에 다시 시도해 주세요." },
  link_disabled: { text: "로그인 방법 추가·해제는 지금 준비 중이에요. 잠시 뒤에 다시 시도해 주세요." },
  link_none: { text: "이어 줄 요청이 없거나 시간이 지났어요. 카카오 화면에서 다시 시도해 주세요." },
  unlink_failed: { text: "로그인 방법을 해제하지 못했어요. 잠시 뒤에 다시 시도해 주세요." },
  unlink_last: { text: "로그인 방법이 하나뿐이라 해제할 수 없어요. 다른 방법을 먼저 추가해 주세요." },
};

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr]">
      <dt className="text-[13px] text-[#574a4f]">{k}</dt>
      <dd className="text-[14px] text-[#292126]">{children}</dd>
    </div>
  );
}

export default async function MyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/mypage");
  const msgKey = (await searchParams).msg;
  const banner = typeof msgKey === "string" ? MESSAGES[msgKey] : undefined;

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

  // 로그인 방법: 이미 쓰는 것(해제 가능) / 더할 수 있는 것(추가). 방법은 항상 1개 이상 남는다.
  const linked = Array.from(new Set(user.providers));
  const methods = linked.map((p) => PROVIDER_LABEL[p] ?? p);
  const addable = OAUTH_PROVIDERS.filter((p) => !linked.includes(p.id));

  return (
    <PaperPage wide>
      <PaperCard className="!px-5 md:!p-10">
        <h1 className="text-[20px] font-bold text-[#292126] md:text-[24px]">마이페이지</h1>

        {banner && (
          <p role={banner.ok ? "status" : "alert"} className={`mt-3 rounded-lg px-3 py-2 text-[13px] ${banner.ok ? "bg-[#eef7f1] text-[#16794b]" : "border border-destructive/40 bg-destructive/5 text-destructive"}`}>
            {banner.text}
          </p>
        )}

        <dl className="mt-4 divide-y divide-[#e8dfe3] border-y border-[#e8dfe3]">
          <Row k="로그인 방법">{methods.length > 0 ? methods.join(" · ") : "-"}</Row>
          <Row k="방법 추가·해제">
            <div className="flex flex-wrap gap-2">
              {addable.map((p) => (
                <form key={p.id} action={startLinkIdentity}>
                  <input type="hidden" name="provider" value={p.id} />
                  <button type="submit" className={outlineBtn}>
                    {p.label} 연결하기
                  </button>
                </form>
              ))}
              {!linked.includes("email") && (
                <Link href={`/forgot-password${user.email ? `?email=${encodeURIComponent(user.email)}` : ""}`} className={outlineBtn}>
                  이메일 로그인 추가(비밀번호 설정)
                </Link>
              )}
              {linked.length > 1 &&
                linked
                  .filter((p) => p !== "email")
                  .map((p) => (
                    <form key={`un-${p}`} action={unlinkProvider}>
                      <input type="hidden" name="provider" value={p} />
                      <button type="submit" className="inline-flex items-center justify-center rounded-lg border border-[#e8dfe3] px-5 py-2 text-[13px] font-bold text-[#574a4f] hover:border-destructive hover:text-destructive">
                        {PROVIDER_LABEL[p] ?? p} 해제
                      </button>
                    </form>
                  ))}
            </div>
            <span className="mt-1 block text-[12px] text-[#8c8c8c]">로그인 방법은 항상 한 가지 이상 남아 있어야 해요.</span>
          </Row>
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
