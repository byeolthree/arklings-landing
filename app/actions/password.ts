"use server";

import { redirect } from "next/navigation";
import type { AuthFormState } from "@/app/actions/auth";
import { describeAuthError } from "@/lib/auth-messages";
import { CONFIRM_FIRST_MESSAGE, getCurrentUser, isConfirmed } from "@/lib/auth";
import { getOrigin } from "@/lib/origin";
import { createAuthClient } from "@/lib/supabase/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");
const UNAVAILABLE = "지금은 이 기능을 쓸 수 없어요. 잠시 뒤에 다시 시도해 주세요.";

// 비밀번호 설정·재설정 메일. 소셜로 가입한 사람이 이메일 로그인도 쓰고 싶을 때, 비밀번호를 잊었을 때 같은 길을 쓴다.
// 가입한 이메일인지 아닌지는 알려 주지 않고 항상 같은 안내를 보여 준다.
export async function requestPasswordReset(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const email = text(fd, "email").trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return { errors: { email: "이메일 주소를 다시 확인해 주세요." }, values: { email } };
  }
  try {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${await getOrigin()}/auth/confirm?next=${encodeURIComponent("/reset-password")}`,
    });
    if (error) {
      const issue = describeAuthError(error, "resend");
      if (issue.next === "later" || error.status === 0 || (error.status ?? 0) >= 500) {
        return { message: issue.message, nextStep: issue.next, values: { email } };
      }
    }
  } catch {
    return { message: UNAVAILABLE, nextStep: "retry", values: { email } };
  }
  return { sentTo: email, values: { email } };
}

// 메일 링크로 들어와 로그인된 상태에서 새 비밀번호를 정한다.
export async function updatePassword(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "링크가 만료되었어요. 비밀번호 설정 메일을 다시 받아 주세요.", nextStep: "resend" };
  if (!isConfirmed(user)) return { message: CONFIRM_FIRST_MESSAGE };
  const password = text(fd, "password");
  const confirm = text(fd, "passwordConfirm");
  const errors: AuthFormState["errors"] = {};
  if (password.length < 8) errors.password = "비밀번호는 8자 이상으로 입력해 주세요.";
  else if (password.length > 72) errors.password = "비밀번호는 72자 이내로 입력해 주세요.";
  else if (user.email && password.toLowerCase() === user.email.toLowerCase()) errors.password = "이메일과 다른 비밀번호를 써 주세요.";
  if (!errors.password && password !== confirm) errors.passwordConfirm = "비밀번호가 서로 달라요. 다시 확인해 주세요.";
  if (Object.keys(errors).length) return { errors };
  try {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const issue = describeAuthError(error, "signup");
      if (issue.field === "password") return { errors: { password: issue.message } };
      return { message: issue.message, nextStep: issue.next };
    }
  } catch {
    return { message: UNAVAILABLE, nextStep: "retry" };
  }
  redirect("/mypage?msg=password_set");
}
