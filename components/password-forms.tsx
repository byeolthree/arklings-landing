"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/app/actions/auth";
import { requestPasswordReset, updatePassword } from "@/app/actions/password";
import { authInputCls, FormField } from "@/components/form-field";
import { CardHeading, PaperCard, primaryBtn } from "@/components/paper-card";

export function ForgotPasswordForm({ initialEmail }: { initialEmail?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(requestPasswordReset, {});
  if (state.sentTo) {
    return (
      <PaperCard>
        <CardHeading title="메일을 보냈어요" lines={[`${state.sentTo} 으로 비밀번호 설정 링크를 보냈어요.`, "이 이메일로 가입한 계정이 있다면 메일이 도착해요."]} />
        <div className="mt-6 flex flex-col gap-3 md:mt-8">
          <ul className="flex flex-col gap-1.5 rounded-lg bg-[#faf7f8] px-4 py-3 text-[12px] leading-normal text-[#574a4f] md:text-[13px]">
            <li>메일이 안 보이면 스팸함도 확인해 주세요.</li>
            <li>구글·카카오로 가입한 계정도 이 링크로 비밀번호를 정하면 이메일로 로그인할 수 있어요.</li>
          </ul>
          <Link href="/login" className={`${primaryBtn} w-full`}>
            로그인 화면으로
          </Link>
        </div>
      </PaperCard>
    );
  }
  return (
    <PaperCard>
      <CardHeading title="비밀번호 설정·재설정" lines={["가입한 이메일을 입력하면 비밀번호를 정하는 링크를 보내 드려요.", "구글·카카오로 가입했다면 이메일 로그인용 비밀번호도 여기서 만들 수 있어요."]} />
      <form action={action} noValidate className="mt-6 flex flex-col gap-4 md:mt-8 md:gap-5">
        {state.message && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-[12px] text-destructive md:text-[13px]">
            {state.message}
          </p>
        )}
        <FormField id="forgot-email" label="이메일" error={state.errors?.email}>
          <input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.values?.email ?? initialEmail}
            disabled={pending}
            aria-invalid={state.errors?.email ? true : undefined}
            aria-describedby={state.errors?.email ? "forgot-email-error" : undefined}
            className={authInputCls}
          />
        </FormField>
        <button type="submit" disabled={pending} className={`${primaryBtn} w-full`}>
          {pending ? "보내는 중…" : "설정 메일 받기"}
        </button>
      </form>
    </PaperCard>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(updatePassword, {});
  const e = state.errors ?? {};
  return (
    <PaperCard>
      <CardHeading title="새 비밀번호 정하기" lines={["8자 이상, 영문과 숫자를 섞어 주세요."]} />
      <form action={action} noValidate className="mt-6 flex flex-col gap-4 md:mt-8 md:gap-5">
        {state.message && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-[12px] text-destructive md:text-[13px]">
            {state.message}
          </p>
        )}
        <FormField id="reset-password" label="새 비밀번호" error={e.password}>
          <input id="reset-password" name="password" type="password" autoComplete="new-password" disabled={pending} aria-invalid={e.password ? true : undefined} aria-describedby={e.password ? "reset-password-error" : undefined} className={authInputCls} />
        </FormField>
        <FormField id="reset-password-confirm" label="새 비밀번호 확인" error={e.passwordConfirm}>
          <input id="reset-password-confirm" name="passwordConfirm" type="password" autoComplete="new-password" disabled={pending} aria-invalid={e.passwordConfirm ? true : undefined} aria-describedby={e.passwordConfirm ? "reset-password-confirm-error" : undefined} className={authInputCls} />
        </FormField>
        <button type="submit" disabled={pending} className={`${primaryBtn} w-full`}>
          {pending ? "저장 중…" : "비밀번호 저장"}
        </button>
        {state.nextStep === "resend" && (
          <Link href="/forgot-password" className="text-center text-[12px] text-jaju underline">
            비밀번호 설정 메일 다시 받기
          </Link>
        )}
      </form>
    </PaperCard>
  );
}
