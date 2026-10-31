"use client";

import { useActionState, useState } from "react";
import { withdrawAccount, type WithdrawState } from "@/app/actions/account";
import { authInputCls } from "@/components/form-field";

const PHRASE = "탈퇴합니다";

export function WithdrawForm() {
  const [state, action, pending] = useActionState<WithdrawState, FormData>(withdrawAccount, {});
  // 오류가 나도 입력한 내용이 지워지지 않게 화면이 값을 들고 있는다.
  const [agree, setAgree] = useState(false);
  const [phrase, setPhrase] = useState("");
  return (
    <form action={action} noValidate className="mt-6 flex flex-col gap-4">
      <label className="flex items-start gap-2 text-[13px] text-[#292126]">
        <input type="checkbox" name="agree" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={pending} />
        <span>위 내용을 모두 확인했고, 지워진 데이터는 되돌릴 수 없다는 것을 알고 있어요.</span>
      </label>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="withdraw-phrase" className="text-[12px] font-medium text-[#292126]">
          확인을 위해 「{PHRASE}」를 똑같이 입력해 주세요
        </label>
        <input
          id="withdraw-phrase"
          name="phrase"
          type="text"
          autoComplete="off"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          disabled={pending}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "withdraw-error" : undefined}
          className={authInputCls}
        />
      </div>
      {state.error && (
        <p id="withdraw-error" role="alert" className="text-[12px] text-destructive md:text-[13px]">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-lg bg-[#c83a3a] px-5 py-3 text-[14px] font-bold text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "처리 중…" : "회원 탈퇴하기"}
      </button>
    </form>
  );
}
