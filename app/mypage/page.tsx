import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { startLinkIdentity, unlinkProvider } from "@/app/actions/social";
import { DisplayNameForm } from "@/components/mypage-forms";
import "@/components/planner/planner.css";
import "@/components/mypage/mypage.css";
import "@/components/register/register.css";
import { RegisterHeader } from "@/components/register/register-steps";
import { requireUser } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { createAuthClient } from "@/lib/supabase/server";
import { OAUTH_PROVIDERS, PROVIDER_LABEL } from "@/lib/providers";

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
  need_profile: { text: "포트폴리오를 작성하려면 먼저 아래 「크리에이터 등록」에서 프로필을 만들어 주세요. 만든 뒤 기획안 화면에서 「포트폴리오 작성하기」를 다시 눌러 주세요." },
  unlink_last: { text: "로그인 방법이 하나뿐이라 해제할 수 없어요. 다른 방법을 먼저 추가해 주세요." },
};

export default async function MyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/mypage");
  const sp = await searchParams;
  const msgKey = sp.msg;
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

  // 로그인 방법: 이미 쓰는 것(해제 가능) / 더할 수 있는 것(추가). 방법은 항상 1개 이상 남는다.
  const linked = Array.from(new Set(user.providers));
  const methods = linked.map((p) => PROVIDER_LABEL[p] ?? p);
  const addable = OAUTH_PROVIDERS.filter((p) => !linked.includes(p.id));

  const basic = (
    <>
      {banner && (
        <p role={banner.ok ? "status" : "alert"} className={`mp-msg ${banner.ok ? "ok" : "err"}`}>
          {banner.text}
        </p>
      )}
      <dl className="mp-rows">
        <div className="mp-row">
          <dt>닉네임</dt>
          <dd>
            {profileLoadFailed ? (
              <p role="alert" className="mp-msg err">
                프로필을 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.
              </p>
            ) : (
              <DisplayNameForm initial={displayName} />
            )}
          </dd>
        </div>
        <div className="mp-row">
          <dt>로그인 방법</dt>
          <dd>{methods.length > 0 ? methods.join(" · ") : "-"}</dd>
        </div>
        <div className="mp-row">
          <dt>방법 추가·해제</dt>
          <dd>
            <div className="mp-btns">
              {addable.map((p) => (
                <form key={p.id} action={startLinkIdentity}>
                  <input type="hidden" name="provider" value={p.id} />
                  <SubmitButton className="btn btn-ghost">{p.label} 연결하기</SubmitButton>
                </form>
              ))}
              {!linked.includes("email") && (
                <Link href={`/forgot-password${user.email ? `?email=${encodeURIComponent(user.email)}` : ""}`} className="btn btn-ghost">
                  이메일 로그인 추가(비밀번호 설정)
                </Link>
              )}
              {linked.length > 1 &&
                linked
                  .filter((p) => p !== "email")
                  .map((p) => (
                    <form key={`un-${p}`} action={unlinkProvider}>
                      <input type="hidden" name="provider" value={p} />
                      <SubmitButton className="btn btn-ghost">{PROVIDER_LABEL[p] ?? p} 해제</SubmitButton>
                    </form>
                  ))}
            </div>
            <span className="mp-note">로그인 방법은 항상 한 가지 이상 남아 있어야 해요.</span>
          </dd>
        </div>
        <div className="mp-row">
          <dt>내 이메일</dt>
          <dd>
            <span style={{ wordBreak: "break-all" }}>{user.email ?? "-"}</span>
            <span className="mp-note">이 주소는 나에게만 보여요.</span>
          </dd>
        </div>
        {linked.includes("email") && (
          <div className="mp-row">
            <dt>비밀번호</dt>
            <dd>
              <div className="mp-btns">
                <Link href={`/forgot-password${user.email ? `?email=${encodeURIComponent(user.email)}` : ""}`} className="btn btn-ghost">
                  비밀번호 변경
                </Link>
              </div>
            </dd>
          </div>
        )}
      </dl>
      <div className="mp-foot">
        <small>
          더 이상 쓰지 않으신다면 <Link href="/mypage/withdraw">회원 탈퇴</Link>를 할 수 있어요.
        </small>
        <form action={signOut}>
          <SubmitButton className="btn btn-ghost">로그아웃</SubmitButton>
        </form>
      </div>
    </>
  );

  return (
    <div className="mp rg">
      <RegisterHeader current="기본 정보" />
      <div className="rg-main bs-main">
        <div className="bs-wrap">
          <div className="bs-card mp-bs">{basic}</div>
        </div>
      </div>
    </div>
  );
}
