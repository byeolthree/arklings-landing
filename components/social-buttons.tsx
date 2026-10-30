"use client";

import { useActionState, useId } from "react";
import { startOAuth } from "@/app/actions/social";
import type { AuthFormState } from "@/app/actions/auth";
import { ConsentDetails } from "@/components/consent-details";
import { CONSENT_LABEL } from "@/lib/consent";
import { OAUTH_PROVIDERS, type OAuthProviderId } from "@/lib/providers";

// 로그인 방식마다 버튼 모양(색)만 다르다. 새 방식은 lib/providers.ts에 더하고 여기에 한 줄 더한다.
const BUTTON_CLS: Record<OAuthProviderId, string> = {
  google: "lk-btn-google",
  kakao: "lk-btn-kakao",
};

// 구글·카카오로 계속하기. 동의 체크를 해야만 작동한다(체크하지 않으면 칸 아래에 안내).
export function SocialButtons({ returnTo, heading = "또는 다른 방법으로 계속하기" }: { returnTo: string; heading?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(startOAuth, {});
  const consentId = useId();
  return (
    <form action={action} noValidate className="lk-stack" style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)", gap: 12 }}>
      <input type="hidden" name="next" value={returnTo} />
      <p className="lk-note lk-center">{heading}</p>
      {state.message && (
        <p role="alert" className="lk-alert">
          {state.message}
        </p>
      )}
      <div className="lk-stack" style={{ gap: 8 }}>
        <label htmlFor={consentId} className="lk-check">
          <input id={consentId} type="checkbox" name="consent" disabled={pending} />
          <span>{CONSENT_LABEL}</span>
        </label>
        <ConsentDetails />
        {state.errors?.consent && (
          <p role="alert" className="lk-error">
            {state.errors.consent}
          </p>
        )}
      </div>
      <div className="lk-stack" style={{ gap: 8 }}>
        {OAUTH_PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="submit"
            name="provider"
            value={p.id}
            disabled={pending}
            className={`lk-btn lk-btn-block ${BUTTON_CLS[p.id]}`}
          >
            {p.label}로 계속
          </button>
        ))}
      </div>
    </form>
  );
}
