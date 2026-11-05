"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestEmail } from "@/app/actions/social";
import type { AuthFormState } from "@/app/actions/auth";
import { authInputCls, FormField } from "@/components/form-field";
import { CardHeading, PaperCard, primaryBtn, outlineBtn } from "@/components/paper-card";

// 이메일 없이 들어온 계정(카카오 등)이 이메일을 입력하고 확인 메일로 본인 확인을 하는 화면.
export function AddEmailForm({ returnTo, providerLabel }: { returnTo: string; providerLabel: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(requestEmail, {});

  if (state.sentTo) {
    return (
      <PaperCard>
        <CardHeading title="확인 메일을 보냈어요" lines={[`${state.sentTo} 으로 보낸 메일의 링크를 눌러 주세요.`, "링크를 누르면 이 이메일이 내 계정으로 확인돼요."]} />
        <div className="mt-6 flex flex-col gap-4 md:mt-8">
          <ul className="flex flex-col gap-1.5 rounded-lg bg-[#faf7f8] px-4 py-3 text-[12px] leading-normal text-[#574a4f] md:text-[13px]">
            <li>메일이 안 보이면 스팸함도 확인해 주세요.</li>
            <li>같은 이메일로 이미 가입한 계정이 있다면, 링크를 누른 뒤 {providerLabel} 로그인을 그 계정에 이어 줄지 한 번 더 물어봐요.</li>
            <li>링크를 누르기 전까지는 기획안 저장 같은 기능을 쓸 수 없어요.</li>
          </ul>
          <form action={action}>
            <input type="hidden" name="next" value={returnTo} />
            <input type="hidden" name="email" value={state.sentTo} />
            <button type="submit" disabled={pending} className={`${outlineBtn} w-full`}>
              {pending ? "보내는 중…" : "확인 메일 다시 보내기"}
            </button>
          </form>
          <Link href={`/auth/add-email?next=${encodeURIComponent(returnTo)}`} className="text-center text-[12px] text-[#6f6469]">
            다른 이메일 주소로 다시 입력하기
          </Link>
        </div>
      </PaperCard>
    );
  }

  return (
    <PaperCard>
      <CardHeading
        title="이메일을 알려 주세요"
        lines={[`${providerLabel} 로그인에서는 이메일을 받지 않았어요.`, "메일로 본인 확인을 하면 가입이 끝나요."]}
      />
      <form action={action} noValidate className="mt-6 flex flex-col gap-4 md:mt-8 md:gap-5">
        <input type="hidden" name="next" value={returnTo} />
        {state.message && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-[12px] text-destructive md:text-[13px]">
            {state.message}
          </p>
        )}
        <FormField id="add-email" label="이메일" hint="확인 메일을 받을 주소예요. 이 주소는 다른 사람에게 보이지 않아요." error={state.errors?.email}>
          <input
            id="add-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.values?.email}
            disabled={pending}
            aria-invalid={state.errors?.email ? true : undefined}
            aria-describedby={state.errors?.email ? "add-email-error" : undefined}
            className={authInputCls}
          />
        </FormField>
        <button type="submit" disabled={pending} className={`${primaryBtn} w-full`}>
          {pending ? "보내는 중…" : "확인 메일 받기"}
        </button>
      </form>
    </PaperCard>
  );
}
