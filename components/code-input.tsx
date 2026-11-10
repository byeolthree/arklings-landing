"use client";

import { useState } from "react";
import { authInputCls } from "@/components/form-field";

// 메일로 받는 확인 번호 자리 수. 서울 Supabase의 「Email OTP Length」 설정과 같아야 한다(서울 프로젝트 8자리).
export const OTP_LENGTH = 8;

const digits = (v: string) => v.replace(/\D/g, "");

// 확인 번호 칸: 한 칸. 메일에서 복사한 번호를 한 번에 붙여 넣을 수 있다(숫자 외 글자는 지운다).
export function CodeInput({ id, name = "code", disabled, invalid }: { id: string; name?: string; disabled?: boolean; invalid?: boolean }) {
  const [value, setValue] = useState("");
  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      aria-label={`확인 번호 ${OTP_LENGTH}자리`}
      aria-invalid={invalid ? true : undefined}
      value={value}
      onChange={(e) => setValue(digits(e.target.value).slice(0, OTP_LENGTH))}
      disabled={disabled}
      className={`${authInputCls} w-full text-center text-[18px] font-bold tracking-[0.35em] tabular-nums`}
    />
  );
}
