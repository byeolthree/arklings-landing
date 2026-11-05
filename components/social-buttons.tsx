"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { startOAuth } from "@/app/actions/social";
import type { AuthFormState } from "@/app/actions/auth";
import { ConsentDetails } from "@/components/consent-details";
import { CONSENT_LABEL, CONSENT_VERSION } from "@/lib/consent";
import { outlineBtn } from "@/components/paper-card";
import { OAUTH_PROVIDERS } from "@/lib/providers";

const CONSENT_KEY = "arklings.consentVersion";

// 구글·카카오로 계속하기. 동의 체크를 해야만 작동한다(체크하지 않으면 칸 아래에 안내).
export function SocialButtons({ returnTo, heading = "또는 다른 방법으로 계속하기" }: { returnTo: string; heading?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(startOAuth, {});
  const consentId = useId();
  // 이 브라우저에서 같은 문구(버전)에 이미 동의했다면 체크가 미리 되어 있다. 보이는 체크칸이라 언제든 풀 수 있다.
  const [agreed, setAgreed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(CONSENT_KEY) === CONSENT_VERSION) setAgreed(true);
    } catch {
      /* 저장소를 쓸 수 없으면 기억 기능만 건너뛴다 */
    }
  }, []);
  return (
    <form
      action={action}
      noValidate
      className="mt-6 flex flex-col gap-3 border-t border-[#e8dfe3] pt-5"
      onSubmit={() => {
        try {
          if (agreed) localStorage.setItem(CONSENT_KEY, CONSENT_VERSION);
          else localStorage.removeItem(CONSENT_KEY);
        } catch {
          /* 저장소를 쓸 수 없으면 기억 기능만 건너뛴다 */
        }
      }}
    >
      <input type="hidden" name="next" value={returnTo} />
      <p className="text-center text-[12px] text-[#6f6469]">{heading}</p>
      {state.message && (
        <p role="alert" className="text-[12px] text-destructive md:text-[13px]">
          {state.message}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor={consentId} className="flex items-start gap-2 text-[12px] font-medium text-[#6f6469] md:text-[13px]">
          <input id={consentId} type="checkbox" name="consent" checked={agreed} onChange={(ev) => setAgreed(ev.target.checked)} disabled={pending} className="mt-0.5 size-4 shrink-0 accent-[#a61e5c]" />
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
