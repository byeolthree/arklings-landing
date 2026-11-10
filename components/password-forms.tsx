"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/app/actions/auth";
import { requestPasswordReset, updatePassword, verifyResetCode, type ResetCodeState } from "@/app/actions/password";
import { CodeInput } from "@/components/code-input";
import { authInputCls, FormField } from "@/components/form-field";
import { FormNotice } from "@/components/form-notice";
import { CardHeading, PaperCard, primaryBtn } from "@/components/paper-card";
import { useStoredValue } from "@/lib/use-stored-value";

export function ForgotPasswordForm({ initialEmail, expired }: { initialEmail?: string; expired?: boolean }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(requestPasswordReset, {});
  // 로그인 화면에서 「이메일 기억하기」를 켜 두었으면 그 이메일을 미리 채운다.
  const remembered = useStoredValue("arklings.rememberedEmail");
  if (state.sentTo) {
    return <ResetCodeStep email={state.sentTo} resend={action} resending={pending} />;
  }
  return (
    <PaperCard>
      <CardHeading title="비밀번호 찾기" lines={[<>가입한 이메일 주소를 입력하면<br className="md:hidden" /> 본인 인증 확인 번호를 보내드려요.</>]} />
      <form action={action} noValidate className="mt-6 flex flex-col gap-4 md:mt-8 md:gap-5">
        <FormField id="forgot-email" label="이메일" error={state.errors?.email}>
          <input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            key={remembered}
            defaultValue={state.values?.email ?? initialEmail ?? (remembered || undefined)}
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
      <FormNotice message={state.message ?? (expired ? "링크가 만료됐거나 이미 사용됐어요. 재설정 메일을 다시 받아 주세요." : undefined)} />
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
      <FormNotice message={state.message} />
    </PaperCard>
  );
}

// 「메일을 보냈어요」 화면: 메일의 확인 번호를 넣으면 같은 화면에서 새 비밀번호를 정한다.
function ResetCodeStep({ email, resend, resending }: { email: string; resend: (fd: FormData) => void; resending: boolean }) {
  const [state, action, pending] = useActionState<ResetCodeState, FormData>(verifyResetCode, {});
  if (state.verified) return <ResetPasswordForm />;
  return (
    <PaperCard>
      <CardHeading title="메일을 보냈어요" lines={["메일에 적힌 본인 인증 확인 번호를 입력해주세요."]} />
      <form action={action} noValidate className="mt-6 flex flex-col gap-4 md:mt-8 md:gap-5">
        <input type="hidden" name="email" value={email} />
        <FormField id="reset-code" label="확인 번호">
          <CodeInput id="reset-code" disabled={pending} invalid={Boolean(state.error)} />
        </FormField>
        <button type="submit" disabled={pending} className={`${primaryBtn} w-full`}>
          {pending ? "확인하는 중…" : "확인"}
        </button>
      </form>
      <form action={resend} className="mt-4 text-center">
        <input type="hidden" name="email" value={email} />
        <button type="submit" disabled={resending} className="text-[12px] text-jaju underline">
          {resending ? "보내는 중…" : "메일 다시 받기"}
        </button>
      </form>
      <FormNotice message={state.error} />
    </PaperCard>
  );
}
