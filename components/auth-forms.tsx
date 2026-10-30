"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resendConfirmation, signIn, signUp, type AuthFormState } from "@/app/actions/auth";
import { ConsentDetails } from "@/components/consent-details";
import { authInputCls, FormField } from "@/components/form-field";
import { CardHeading, PaperCard, primaryBtn, outlineBtn } from "@/components/paper-card";
import { CONSENT_LABEL } from "@/lib/consent";
import { LkCard, LkField } from "@/components/landing-kit";
import { SocialButtons } from "@/components/social-buttons";

const withNext = (path: string, next: string) => `${path}?next=${encodeURIComponent(next)}`;

function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-[12px] leading-normal text-destructive md:text-[13px]">
      {message}
    </p>
  );
}

// 확인 메일을 (다시) 받는 칸. 로그인 화면(확인 전 계정)과 만료된 링크 화면, 가입 직후 안내에서 쓴다.
export function ResendBox({ email, returnTo, askEmail }: { email?: string; returnTo: string; askEmail?: boolean }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(resendConfirmation, {});
  const sentTo = state.sentTo ?? email;
  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-[#e8dfe3] bg-[#faf7f8] p-3">
      <input type="hidden" name="next" value={returnTo} />
      {askEmail ? (
        <FormField id="resend-email" label="가입한 이메일" error={state.message && !state.sentTo ? state.message : undefined}>
          <input
            id="resend-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={email}
            disabled={pending}
            className={authInputCls}
          />
        </FormField>
      ) : (
        <>
          <input type="hidden" name="email" value={email ?? ""} />
          <p className="text-[12px] text-[#574a4f] md:text-[13px]">
            <span className="font-medium text-[#292126]">{email}</span> 으로 확인 메일을 다시 보낼 수 있어요.
          </p>
        </>
      )}
      {state.resent && !state.message && (
        <p role="status" className="text-[12px] text-[#16794b] md:text-[13px]">
          {sentTo} 으로 확인 메일을 다시 보냈어요. 스팸함도 확인해 주세요.
        </p>
      )}
      {state.message && state.sentTo && (
        <p role="alert" className="text-[12px] text-destructive md:text-[13px]">
          {state.message}
        </p>
      )}
      {!askEmail && state.message && !state.sentTo && (
        <p role="alert" className="text-[12px] text-destructive md:text-[13px]">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${outlineBtn} w-full`}>
        {pending ? "보내는 중…" : "확인 메일 다시 보내기"}
      </button>
    </form>
  );
}

export function CheckEmailCard({ email, returnTo }: { email: string; returnTo: string }) {
  return (
    <PaperCard>
      <CardHeading
        title="확인 메일을 보냈어요"
        lines={[`${email} 으로 보낸 메일의 링크를 누르면 가입이 끝나요.`, "링크를 누르기 전에는 로그인할 수 없어요."]}
      />
      <div className="mt-6 flex flex-col gap-4 md:mt-8">
        <ul className="flex flex-col gap-1.5 rounded-lg bg-[#faf7f8] px-4 py-3 text-[12px] leading-normal text-[#574a4f] md:text-[13px]">
          <li>메일이 안 보이면 스팸함도 확인해 주세요. 발신 주소가 임시라 스팸함으로 갈 수 있어요.</li>
          <li>이미 가입한 이메일이라면 가입 확인 메일 대신 비밀번호 설정 메일이 가요. 그 링크로 비밀번호를 정하면 로그인할 수 있어요.</li>
        </ul>
        <ResendBox email={email} returnTo={returnTo} />
        <Link href={withNext("/login", returnTo)} className={`${primaryBtn} w-full`}>
          로그인하러 가기
        </Link>
        <a href={withNext("/signup", returnTo)} className="text-center text-[12px] text-[#6f6469] hover:text-jaju">
          다른 이메일로 다시 가입하기
        </a>
      </div>
    </PaperCard>
  );
}

export function SignupForm({ returnTo }: { returnTo: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUp, {});
  const e = state.errors ?? {};
  const v = state.values ?? {};
  if (state.sentTo) return <CheckEmailCard email={state.sentTo} returnTo={state.returnTo ?? returnTo} />;

  return (
    <PaperCard>
      <CardHeading title="가입하기" lines={["이메일로 가입하면 기획안을 저장하고 공개할 수 있어요.", "가입 후 확인 메일의 링크를 눌러 주세요."]} />
      <form action={action} noValidate className="mt-6 flex flex-col gap-4 md:mt-8 md:gap-5">
        <input type="hidden" name="next" value={returnTo} />
        <ErrorBox message={state.message} />
        <FormField id="displayName" label="공개 이름" hint="포트폴리오에서 다른 사람에게 보이는 이름이에요. 30자 이내." error={e.displayName}>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="nickname"
            maxLength={30}
            defaultValue={v.displayName}
            disabled={pending}
            aria-invalid={e.displayName ? true : undefined}
            aria-describedby={e.displayName ? "displayName-error" : undefined}
            className={authInputCls}
          />
        </FormField>
        <FormField id="email" label="이메일" hint="확인 메일을 받을 주소예요. 이 주소는 다른 사람에게 보이지 않아요." error={e.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={v.email}
            disabled={pending}
            aria-invalid={e.email ? true : undefined}
            aria-describedby={e.email ? "email-error" : undefined}
            className={authInputCls}
          />
        </FormField>
        <FormField id="password" label="비밀번호" hint="8자 이상, 영문과 숫자를 섞어 주세요." error={e.password}>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            disabled={pending}
            aria-invalid={e.password ? true : undefined}
            aria-describedby={e.password ? "password-error" : undefined}
            className={authInputCls}
          />
        </FormField>
        <FormField id="passwordConfirm" label="비밀번호 확인" error={e.passwordConfirm}>
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            disabled={pending}
            aria-invalid={e.passwordConfirm ? true : undefined}
            aria-describedby={e.passwordConfirm ? "passwordConfirm-error" : undefined}
            className={authInputCls}
          />
        </FormField>

        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-2 text-[12px] font-medium text-[#6f6469] md:text-[13px]">
            <input type="checkbox" name="consent" disabled={pending} className="mt-0.5 size-4 shrink-0 accent-[#a61e5c]" />
            <span>{CONSENT_LABEL}</span>
          </label>
          <ConsentDetails />
          {e.consent && (
            <p role="alert" className="text-[12px] text-destructive">
              {e.consent}
            </p>
          )}
        </div>

        <button type="submit" disabled={pending} className={`${primaryBtn} w-full`}>
          {pending ? "가입 중…" : "가입하기"}
        </button>
        <p className="text-center text-[12px] text-[#6f6469]">
          이미 계정이 있나요?{" "}
          <Link href={withNext("/login", returnTo)} className="text-jaju underline">
            로그인
          </Link>
        </p>
      </form>
      <SocialButtons returnTo={returnTo} heading="또는 구글·카카오로 바로 가입하기" />
    </PaperCard>
  );
}

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signIn, {});
  const e = state.errors ?? {};
  const v = state.values ?? {};

  return (
    <LkCard>
      <form action={action} noValidate className="lk-stack">
        <input type="hidden" name="next" value={returnTo} />
        {state.message && (
          <p role="alert" className="lk-alert">
            {state.message}
          </p>
        )}
        <LkField id="login-email" label="이메일" error={e.email}>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={v.email}
            disabled={pending}
            aria-invalid={e.email ? true : undefined}
            aria-describedby={e.email ? "login-email-error" : undefined}
            className="lk-input"
          />
        </LkField>
        <LkField id="login-password" label="비밀번호" error={e.password}>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            disabled={pending}
            aria-invalid={e.password ? true : undefined}
            aria-describedby={e.password ? "login-password-error" : undefined}
            className="lk-input"
          />
        </LkField>
        <button type="submit" disabled={pending} className="lk-btn lk-btn-primary lk-btn-block">
          {pending ? "로그인 중…" : "로그인"}
        </button>
      </form>

      {state.needsConfirm && (
        <div className="lk-stack" style={{ marginTop: 16 }}>
          <ResendBox email={state.needsConfirm} returnTo={state.returnTo ?? returnTo} />
        </div>
      )}

      {state.message && (
        <div className="lk-details" style={{ marginTop: 16 }}>
          <p style={{ margin: 0 }}>구글·카카오로 가입했거나 비밀번호를 정한 적이 없다면 아래 방법을 써 보세요.</p>
          <ul style={{ margin: "6px 0 0", paddingLeft: 16 }}>
            <li>아래 「구글로 계속」「카카오로 계속」 버튼</li>
            <li>
              <Link href={`/forgot-password${v.email ? `?email=${encodeURIComponent(v.email)}` : ""}`} className="lk-link">
                비밀번호 설정 메일 받기
              </Link>
            </li>
          </ul>
        </div>
      )}

      <p className="lk-note lk-center" style={{ marginTop: 20 }}>
        비밀번호가 기억나지 않나요?{" "}
        <Link href="/forgot-password" className="lk-link">
          비밀번호 설정·재설정
        </Link>
      </p>
      <p className="lk-note lk-center" style={{ marginTop: 8 }}>
        아직 계정이 없나요?{" "}
        <Link href={withNext("/signup", returnTo)} className="lk-link">
          가입하기
        </Link>
      </p>
      <SocialButtons returnTo={returnTo} />
    </LkCard>
  );
}
