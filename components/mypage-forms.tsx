"use client";

import { useActionState } from "react";
import { updateDisplayName, type AuthFormState } from "@/app/actions/auth";
import { authInputCls, FormField } from "@/components/form-field";
import { outlineBtn } from "@/components/paper-card";

export function DisplayNameForm({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(updateDisplayName, {});
  const value = state.values?.displayName ?? initial;
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormField
        id="mypage-displayName"
        label="공개 이름"
        hint="포트폴리오에서 다른 사람에게 보이는 이름이에요. 30자 이내."
        error={state.errors?.displayName}
      >
        <input
          id="mypage-displayName"
          name="displayName"
          type="text"
          maxLength={30}
          defaultValue={value}
          key={value}
          disabled={pending}
          aria-invalid={state.errors?.displayName ? true : undefined}
          aria-describedby={state.errors?.displayName ? "mypage-displayName-error" : undefined}
          className={authInputCls}
        />
      </FormField>
      {state.message && (
        <p role="alert" className="text-[12px] text-destructive md:text-[13px]">
          {state.message}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-[12px] text-[#16794b] md:text-[13px]">
          이름을 저장했어요.
        </p>
      )}
      <div>
        <button type="submit" disabled={pending} className={outlineBtn}>
          {pending ? "저장 중…" : "이름 저장"}
        </button>
      </div>
    </form>
  );
}
