"use client";

import { useRef, useState } from "react";
import { authInputCls } from "@/components/form-field";

// 메일로 받는 확인 번호 자리 수. 서울 Supabase의 「Email OTP Length」 설정과 같아야 한다(기본 6).
export const OTP_LENGTH = 6;

const digits = (v: string) => v.replace(/\D/g, "");

// 확인 번호 칸: 두 칸으로 나누고 가운데에 하이픈(예: 123 - 456). 붙여넣기는 전체를 나눠 채운다.
// 폼에는 합친 값이 name 이름으로 넘어간다.
export function CodeInput({ id, name = "code", disabled, invalid }: { id: string; name?: string; disabled?: boolean; invalid?: boolean }) {
  const half = OTP_LENGTH / 2;
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const secondRef = useRef<HTMLInputElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  const spread = (all: string) => {
    const d = digits(all).slice(0, OTP_LENGTH);
    setFirst(d.slice(0, half));
    setSecond(d.slice(half));
    if (d.length >= half) secondRef.current?.focus();
  };
  const cls = `${authInputCls} min-w-0 flex-1 text-center text-[18px] font-bold tracking-[0.35em] tabular-nums`;

  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name={name} value={first + second} />
      <input
        ref={firstRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label={`확인 번호 앞 ${half}자리`}
        aria-invalid={invalid ? true : undefined}
        maxLength={OTP_LENGTH}
        value={first}
        disabled={disabled}
        onChange={(e) => {
          const d = digits(e.target.value);
          if (d.length > half) return spread(d + second);
          setFirst(d);
          if (d.length === half) secondRef.current?.focus();
        }}
        onPaste={(e) => {
          e.preventDefault();
          spread(e.clipboardData.getData("text"));
        }}
        className={cls}
      />
      <span aria-hidden className="text-[18px] font-bold text-[#8c8c8c]">
        -
      </span>
      <input
        ref={secondRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={`확인 번호 뒤 ${half}자리`}
        aria-invalid={invalid ? true : undefined}
        maxLength={OTP_LENGTH}
        value={second}
        disabled={disabled}
        onChange={(e) => setSecond(digits(e.target.value).slice(0, half))}
        onPaste={(e) => {
          e.preventDefault();
          spread(e.clipboardData.getData("text"));
        }}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && second === "") firstRef.current?.focus();
        }}
        className={cls}
      />
    </div>
  );
}
