"use client";

import { useActionState, useId } from "react";
import { startOAuth } from "@/app/actions/social";
import type { AuthFormState } from "@/app/actions/auth";
import { ConsentDetails } from "@/components/consent-details";
import { CONSENT_LABEL } from "@/lib/consent";
import { outlineBtn } from "@/components/paper-card";
import { OAUTH_PROVIDERS } from "@/lib/providers";

// 구글·카카오로 계속하기. 동의 체크를 해야만 작동한다(체크하지 않으면 칸 아래에 안내).
export function SocialButtons({ returnTo, heading = "또는 다른 방법으로 계속하기" }: { returnTo: string; heading?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(startOAuth, {});
  const consentId = useId();
  return (
    <form action={action} noValidate className="mt-6 flex flex-col gap-3 border-t border-[#e8dfe3] pt-5">
      <input type="hidden" name="next" value={returnTo} />
      <p className="text-center text-[12px] text-[#6f6469]">{heading}</p>
      {state.message && (
        <p role="alert" className="text-[12px] text-destructive md:text-[13px]">
          {state.message}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor={consentId} className="flex items-start gap-2 text-[12px] font-medium text-[#6f6469] md:text-[13px]">
          <input id={consentId} type="checkbox" name="consent" disabled={pending} className="mt-0.5 size-4 shrink-0 accent-[#a61e5c]" />
          <span>{CONSENT_LABEL}</span>
        </label>
        <ConsentDetails />
        {state.errors?.consent && (
          <p role="alert" className="text-[12px] text-destructive">
            {state.errors.consent}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {OAUTH_PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="submit"
            name="provider"
            value={p.id}
            disabled={pending}
            className={`${outlineBtn} w-full disabled:opacity-60`}
          >
            {p.label}로 계속
          </button>
        ))}
      </div>
    </form>
  );
}
