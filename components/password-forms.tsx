"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/app/actions/auth";
import { requestPasswordReset, updatePassword } from "@/app/actions/password";
import { authInputCls, FormField } from "@/components/form-field";
import { CardHeading, PaperCard, primaryBtn } from "@/components/paper-card";

export function ForgotPasswordForm({ initialEmail, expired }: { initialEmail?: string; expired?: boolean }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(requestPasswordReset, {});
  if (state.sentTo) {
    return (
      <PaperCard>
        <CardHeading title="메일을 보냈어요" />
        <div className="mt-6 flex flex-col gap-3 md:mt-8">
          <ul className="flex flex-col gap-1.5 rounded-lg bg-[#faf7f8] px-4 py-3 text-[12px] leading-normal text-[#574a4f] md:text-[13px]">
            <li className="text-center">
              메일의 링크를 누르면 새 비밀번호를 정할 수 있어요.
            </li>
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
      <CardHeading title="비밀번호 찾기" lines={["가입한 이메일을 입력하면 비밀번호를 다시 정하는 링크를 보내 드려요."]} />
      <form action={action} noValidate className="mt-6 flex flex-col gap-4 md:mt-8 md:gap-5">
        {(state.message || expired) && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-[12px] text-destructive md:text-[13px]">
            {state.message ?? "링크가 만료됐거나 이미 사용됐어요. 재설정 메일을 다시 받아 주세요."}
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
          {pending ? "보내는 중…" : "재설정 메일 받기"}
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
            재설정 메일 다시 받기
          </Link>
        )}
      </form>
    </PaperCard>
  );
}
