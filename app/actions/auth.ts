"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { describeAuthError, type AuthIssue } from "@/lib/auth-messages";
import { getCurrentUser } from "@/lib/auth";
import { CONSENT_VERSION } from "@/lib/consent";
import { getOrigin } from "@/lib/origin";
import { safeNext } from "@/lib/safe-next";
import { createAuthClient } from "@/lib/supabase/server";

export type AuthField = "displayName" | "email" | "password" | "passwordConfirm" | "consent";

export type AuthFormState = {
  errors?: Partial<Record<AuthField, string>>;
  message?: string;
  // 실패했을 때 화면이 보여 줄 "다음에 할 일" 버튼 종류
  nextStep?: AuthIssue["next"];
  values?: { displayName?: string; email?: string };
  // 확인 메일을 보낸 주소와, 확인 뒤 돌아갈 주소
  sentTo?: string;
  resent?: boolean;
  returnTo?: string;
  // 확인 메일을 다시 받아야 하는 주소(로그인 화면에서 확인 전 계정일 때)
  needsConfirm?: string;
  saved?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 254;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // 비밀번호 저장 방식(bcrypt)이 72바이트까지만 보기 때문
const MAX_NAME = 30;

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");
const cleanEmail = (v: string) => v.trim().toLowerCase();

// 확인 메일의 링크는 이 주소로 돌아온다(사이트 주소는 Supabase 화면의 허용 목록에 등록해 둔다).
async function confirmUrl(next: string): Promise<string> {
  return `${await getOrigin()}/auth/confirm?next=${encodeURIComponent(next)}`;
}

function validateName(raw: string): { value: string; error?: string } {
  const value = raw.replace(/\s+/g, " ").trim();
  if (value.length < 1) return { value, error: "공개 이름을 입력해 주세요." };
  if (value.length > MAX_NAME) return { value, error: `공개 이름은 ${MAX_NAME}자 이내로 입력해 주세요.` };
  if (/[\u0000-\u001f\u007f<>]/.test(value)) return { value, error: "공개 이름에 쓸 수 없는 문자가 있어요." };
  return { value };
}

const UNAVAILABLE = "지금은 이 기능을 쓸 수 없어요. 잠시 뒤에 다시 시도해 주세요.";

export async function signUp(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const name = validateName(text(fd, "displayName"));
  const email = cleanEmail(text(fd, "email"));
  const password = text(fd, "password");
  const passwordConfirm = text(fd, "passwordConfirm");
  const consent = fd.get("consent") === "on";
  const returnTo = safeNext(text(fd, "next"));
  const values = { displayName: name.value, email };

  const errors: AuthFormState["errors"] = {};
  if (name.error) errors.displayName = name.error;
  if (!email || email.length > MAX_EMAIL || !EMAIL_RE.test(email)) errors.email = "이메일 주소를 다시 확인해 주세요.";
  if (password.length < MIN_PASSWORD) errors.password = `비밀번호는 ${MIN_PASSWORD}자 이상으로 입력해 주세요.`;
  else if (password.length > MAX_PASSWORD) errors.password = `비밀번호는 ${MAX_PASSWORD}자 이내로 입력해 주세요.`;
  else if (password.toLowerCase() === email) errors.password = "이메일과 다른 비밀번호를 써 주세요.";
  if (!errors.password && password !== passwordConfirm) errors.passwordConfirm = "비밀번호가 서로 달라요. 다시 확인해 주세요.";
  if (!consent) errors.consent = "개인정보 수집·이용에 동의해 주세요. 동의하지 않으면 가입할 수 없어요.";
  if (Object.keys(errors).length) return { errors, values, returnTo };

  try {
    const supabase = await createAuthClient();
    const { data: signed, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name.value, consent_version: CONSENT_VERSION },
        emailRedirectTo: await confirmUrl(returnTo),
      },
    });
    if (error) {
      // 이미 가입된 이메일이어도 "이미 있다"고 알려 주지 않고 같은 안내로 이어 간다(계정 존재 여부가 새지 않게).
      if (error.code === "user_already_exists" || error.code === "email_exists") {
        await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await getOrigin()}/auth/confirm?next=${encodeURIComponent("/reset-password")}` }).catch(() => null);
        return { sentTo: email, values, returnTo };
      }
      const issue = describeAuthError(error, "signup");
      if (issue.field) return { errors: { [issue.field]: issue.message }, nextStep: issue.next, values, returnTo };
      return { message: issue.message, nextStep: issue.next, values, returnTo };
    }
    // 이미 확인이 끝난 계정의 이메일이면(가입 정보가 비어 돌아옴) 가입 메일 대신 비밀번호 설정 메일을 보낸다.
    // 구글·카카오로 먼저 가입한 사람이 같은 이메일로 이메일 로그인도 쓰려는 경우에 이 링크로 비밀번호를 정한다.
    if (signed?.user && Array.isArray(signed.user.identities) && signed.user.identities.length === 0) {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await getOrigin()}/auth/confirm?next=${encodeURIComponent("/reset-password")}` }).catch(() => null);
    }
  } catch {
    return { message: UNAVAILABLE, nextStep: "retry", values, returnTo };
  }
  return { sentTo: email, values, returnTo };
}

export async function resendConfirmation(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const email = cleanEmail(text(fd, "email"));
  const returnTo = safeNext(text(fd, "next"));
  if (!email || email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
    return { message: "이메일 주소를 다시 확인해 주세요.", nextStep: "retry", values: { email }, returnTo };
  }
  try {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: await confirmUrl(returnTo) },
    });
    if (error) {
      const issue = describeAuthError(error, "resend");
      // 너무 자주 요청했거나 메일을 보낼 수 없을 때만 알린다. 그 밖에는 가입 여부가 새지 않게 같은 안내를 보여 준다.
      if (issue.next === "later" || error.status === 0 || (error.status ?? 0) >= 500) {
        return { message: issue.message, nextStep: issue.next, sentTo: email, values: { email }, returnTo };
      }
    }
  } catch {
    return { message: UNAVAILABLE, nextStep: "retry", values: { email }, returnTo };
  }
  return { sentTo: email, resent: true, values: { email }, returnTo };
}

export async function signIn(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const email = cleanEmail(text(fd, "email"));
  const password = text(fd, "password");
  const returnTo = safeNext(text(fd, "next"));
  const values = { email };

  const errors: AuthFormState["errors"] = {};
  if (!email || !EMAIL_RE.test(email)) errors.email = "이메일 주소를 입력해 주세요.";
  if (!password) errors.password = "비밀번호를 입력해 주세요.";
  if (Object.keys(errors).length) return { errors, values, returnTo };

  try {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const issue = describeAuthError(error, "login");
      return {
        message: issue.message,
        nextStep: issue.next,
        values,
        returnTo,
        needsConfirm: issue.next === "resend" ? email : undefined,
      };
    }
  } catch {
    return { message: UNAVAILABLE, nextStep: "retry", values, returnTo };
  }
  redirect(returnTo);
}

export async function signOut(): Promise<void> {
  try {
    const supabase = await createAuthClient();
    // 이 기기에서만 로그아웃한다(다른 기기의 로그인은 그대로).
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // 연결이 안 돼도 홈으로 돌려보낸다.
  }
  redirect("/");
}

export async function updateDisplayName(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "로그인이 풀렸어요. 다시 로그인해 주세요.", nextStep: "retry" };
  const name = validateName(text(fd, "displayName"));
  if (name.error) return { errors: { displayName: name.error }, values: { displayName: name.value } };
  try {
    const supabase = await createAuthClient();
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: name.value });
    if (error) return { message: "이름을 저장하지 못했어요. 잠시 뒤에 다시 시도해 주세요.", values: { displayName: name.value } };
  } catch {
    return { message: UNAVAILABLE, values: { displayName: name.value } };
  }
  revalidatePath("/mypage");
  return { saved: true, values: { displayName: name.value } };
}
