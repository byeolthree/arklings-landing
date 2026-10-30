"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthFormState } from "@/app/actions/auth";
import { describeAuthError } from "@/lib/auth-messages";
import { getCurrentUser } from "@/lib/auth";
import { CONSENT_VERSION } from "@/lib/consent";
import { getOrigin } from "@/lib/origin";
import { isOAuthProvider, oauthOptions, type OAuthProviderId } from "@/lib/providers";
import { safeNext } from "@/lib/safe-next";
import { findPendingLink } from "@/lib/social-link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";

const UNAVAILABLE = "지금은 이 기능을 쓸 수 없어요. 잠시 뒤에 다시 시도해 주세요.";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

async function callbackUrl(next: string): Promise<string> {
  return `${await getOrigin()}/auth/callback?next=${encodeURIComponent(next)}`;
}

// 구글·카카오로 계속하기. 동의 체크가 없으면 보내지 않는다. 동의한 문구 버전은 돌아온 뒤(callback)에 기록한다.
export async function startOAuth(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const provider = text(fd, "provider");
  const next = safeNext(text(fd, "next"));
  if (!isOAuthProvider(provider)) return { message: "지원하지 않는 로그인 방법이에요.", returnTo: next };
  if (fd.get("consent") !== "on") {
    return { errors: { consent: "개인정보 수집·이용에 동의해 주세요. 동의하지 않으면 소셜 로그인을 쓸 수 없어요." }, returnTo: next };
  }
  const cookieStore = await cookies();
  let url: string | undefined;
  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: await callbackUrl(next), skipBrowserRedirect: true, ...oauthOptions(provider) },
    });
    if (error || !data.url) return { message: describeAuthError(error, "login").message, nextStep: "retry", returnTo: next };
    url = data.url;
  } catch {
    return { message: UNAVAILABLE, nextStep: "retry", returnTo: next };
  }
  cookieStore.set("arklings_consent", CONSENT_VERSION, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/auth",
    maxAge: 15 * 60,
  });
  redirect(url);
}

// 이미 로그인한 사람이 마이페이지에서 로그인 방법(구글·카카오)을 추가한다.
export async function startLinkIdentity(fd: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fmypage");
  const provider = text(fd, "provider");
  if (!isOAuthProvider(provider)) redirect("/mypage?msg=link_failed");
  let url: string | undefined;
  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo: await callbackUrl("/mypage?msg=linked"), skipBrowserRedirect: true, ...oauthOptions(provider) },
    });
    if (error || !data?.url) redirect(`/mypage?msg=${error?.code === "manual_linking_disabled" ? "link_disabled" : "link_failed"}`);
    url = data.url;
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    redirect("/mypage?msg=link_failed");
  }
  redirect(url);
}

// 로그인 방법 해제. 방법이 하나뿐이면 해제할 수 없다(항상 1개 이상 남긴다).
export async function unlinkProvider(fd: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fmypage");
  const provider = text(fd, "provider");
  let result = "unlinked";
  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.getUserIdentities();
    const identities = data?.identities ?? [];
    const target = identities.find((i) => i.provider === provider);
    if (error || !target) result = "unlink_failed";
    else if (identities.length < 2) result = "unlink_last";
    else {
      const { error: unlinkError } = await supabase.auth.unlinkIdentity(target);
      if (unlinkError) result = unlinkError.code === "manual_linking_disabled" ? "link_disabled" : "unlink_failed";
    }
  } catch {
    result = "unlink_failed";
  }
  redirect(`/mypage?msg=${result}`);
}

function pickProvider(providers: string[]): OAuthProviderId | null {
  const found = providers.find(isOAuthProvider);
  return found && isOAuthProvider(found) ? found : null;
}

// 이메일 없이 들어온 소셜 계정이 이메일을 입력한다.
//  · 아직 아무도 안 쓰는 이메일 → 이 계정에 이메일을 붙이는 확인 메일을 보낸다.
//  · 이미 다른 계정이 쓰는 이메일 → 그 이메일로 로그인 링크를 보낸다(링크를 누르고 직접 승인해야 이어진다).
// 어느 쪽이든 화면에는 똑같은 안내만 보여 준다(이미 가입한 이메일인지 알려 주지 않는다).
export async function requestEmail(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const user = await getCurrentUser();
  const returnTo = safeNext(text(fd, "next"));
  if (!user) return { message: "로그인이 풀렸어요. 다시 로그인해 주세요.", nextStep: "retry", returnTo };
  if (user.email && user.emailConfirmed) redirect(returnTo);
  const email = text(fd, "email").trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return { errors: { email: "이메일 주소를 다시 확인해 주세요." }, values: { email }, returnTo };

  const origin = await getOrigin();
  try {
    const admin = createAdminClient();
    const { data: otherId, error: findError } = await admin.rpc("find_user_id_by_email", { p_email: email });
    if (findError) return { message: UNAVAILABLE, nextStep: "retry", values: { email }, returnTo };

    if (otherId && otherId !== user.id) return await sendLinkToExisting(user.id, pickProvider(user.providers), email, origin, returnTo);

    const supabase = await createAuthClient();
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(returnTo)}` });
    if (error) {
      // 그 사이 다른 계정이 같은 이메일을 쓰게 된 경우도 같은 안내로 이어 간다.
      if (error.code === "email_exists") return await sendLinkToExisting(user.id, pickProvider(user.providers), email, origin, returnTo);
      const issue = describeAuthError(error, "resend");
      if (issue.field === "email") return { errors: { email: issue.message }, values: { email }, returnTo };
      return { message: issue.message, nextStep: issue.next, values: { email }, returnTo };
    }
  } catch {
    return { message: UNAVAILABLE, nextStep: "retry", values: { email }, returnTo };
  }
  return { sentTo: email, values: { email }, returnTo };
}

async function sendLinkToExisting(
  sourceUserId: string,
  provider: OAuthProviderId | null,
  email: string,
  origin: string,
  returnTo: string,
): Promise<AuthFormState> {
  const admin = createAdminClient();
  const { error: saveError } = await admin
    .from("pending_identity_links")
    .upsert({ source_user_id: sourceUserId, provider: provider ?? "kakao", target_email: email, created_at: new Date().toISOString() }, { onConflict: "source_user_id" });
  if (saveError) return { message: UNAVAILABLE, nextStep: "retry", values: { email }, returnTo };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { message: UNAVAILABLE, nextStep: "retry", values: { email }, returnTo };
  // 로그인 기록을 남기지 않는 따로 만든 연결로 보낸다(지금 로그인한 계정 쿠키를 건드리지 않는다).
  const anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { error } = await anon.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/auth/link-social")}` },
  });
  if (error) {
    const issue = describeAuthError(error, "resend");
    if (issue.next === "later" || (error.status ?? 0) >= 500 || error.status === 0) {
      return { message: issue.message, nextStep: issue.next, values: { email }, returnTo };
    }
  }
  return { sentTo: email, values: { email }, returnTo };
}

// 이어주기 승인: 이메일 계정 주인이 로그인한 상태에서 누른다. 이메일 없이 만들어진 임시 소셜 계정을 지우고
// 그 소셜 로그인 방법을 이 계정에 붙이러 간다. 소셜 로그인 화면으로 보낼 수 없으면 아무것도 지우지 않는다.
export async function finishSocialLink(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fauth%2Flink-social");
  if (!user.email || !user.emailConfirmed) redirect("/mypage");
  let url: string | undefined;
  let failure: string | null = null;
  try {
    const pending = await findPendingLink(user.email);
    if (!pending || !isOAuthProvider(pending.provider)) redirect("/mypage?msg=link_none");
    const admin = createAdminClient();
    // 임시 계정이 정말 이메일 없고 기획안도 없는 빈 계정일 때만 지운다.
    const { data: source } = await admin.auth.admin.getUserById(pending.sourceUserId);
    const { count, error: countError } = await admin.from("plans").select("id", { count: "exact", head: true }).eq("owner_id", pending.sourceUserId);
    // 개수를 확인하지 못하면 지우지 않는다(안전한 쪽으로 닫힘).
    if (!source?.user || source.user.email || countError || count === null || count > 0) {
      failure = "link_failed";
    } else {
      const supabase = await createAuthClient();
      const { data, error } = await supabase.auth.linkIdentity({
        provider: pending.provider,
        options: { redirectTo: await callbackUrl("/mypage?msg=linked"), skipBrowserRedirect: true, ...oauthOptions(pending.provider) },
      });
      if (error || !data?.url) {
        failure = error?.code === "manual_linking_disabled" ? "link_disabled" : "link_failed";
      } else {
        const { error: delError } = await admin.auth.admin.deleteUser(pending.sourceUserId);
        if (delError) failure = "link_failed";
        else url = data.url;
      }
    }
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    failure = "link_failed";
  }
  if (failure || !url) redirect(`/mypage?msg=${failure ?? "link_failed"}`);
  redirect(url);
}

// 이어주기를 원하지 않을 때: 요청 기록만 지우고 이 계정으로 계속 쓴다.
export async function dismissSocialLink(): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.email) redirect("/mypage");
  try {
    const pending = await findPendingLink(user.email);
    if (pending) await createAdminClient().from("pending_identity_links").delete().eq("source_user_id", pending.sourceUserId);
  } catch {
    // 기록이 남아도 1시간 뒤 만료된다.
  }
  redirect("/mypage");
}
