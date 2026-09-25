"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const SUBMIT_DELAY_MS = 800;

type Status = "idle" | "submitting" | "success" | "error";

const fieldClass =
  "h-10 rounded-lg border-[#d9d9d9] bg-[#fafafa] px-3 text-sm text-title shadow-none focus-visible:border-jaju focus-visible:ring-jaju/30 disabled:opacity-100 md:h-11";

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function EnvelopeIcon() {
  return (
    <>
      <img
        src="/images/apply-envelope-mobile.svg"
        alt=""
        width={36}
        height={27}
        className="md:hidden"
      />
      <img
        src="/images/apply-envelope-desktop.svg"
        alt=""
        width={44}
        height={33}
        className="hidden md:block"
      />
    </>
  );
}

function CheckIcon() {
  return (
    <span
      aria-hidden
      className="flex size-[52px] items-center justify-center rounded-full bg-jaju text-white md:size-16"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[22px] md:size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12.5 10 17.5 19 7" />
      </svg>
    </span>
  );
}

export function ApplyForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const data = new FormData(event.currentTarget);
    const missing = ["name", "contact", "purpose", "want"].some(
      (key) => !String(data.get(key) ?? "").trim(),
    );

    setStatus("submitting");
    try {
      // 미션 6에서 Supabase 저장·발송으로 교체한다.
      await delay(SUBMIT_DELAY_MS);
      setStatus(missing ? "error" : "success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <section
        className="flex w-full max-w-[600px] flex-col items-center gap-4 rounded-[16px] border border-[#e6e6e6] bg-white px-6 py-10 text-center shadow-[0_6px_24px_rgba(0,0,0,0.08)] md:gap-5 md:px-14 md:py-16 md:shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
        role="status"
      >
        <CheckIcon />
        <h1 className="text-lg font-bold text-title md:text-[22px]">
          신청이 접수됐습니다
        </h1>
        <p className="text-xs leading-normal text-body md:text-[13px]">
          검토 후 남겨주신 연락처로 안내드릴게요.
          <br />
          마이페이지에서도 진행 상황을 확인하실 수 있습니다.
        </p>
        <Button
          type="button"
          className="mt-5 h-auto w-full rounded-lg bg-jaju px-5 py-2 text-[13px] font-bold text-white hover:bg-jaju/90 md:mt-7 md:w-auto"
        >
          마이페이지로 이동
        </Button>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section
        className="flex w-full max-w-[600px] flex-col items-center rounded-[16px] border border-[#e6e6e6] bg-white px-6 py-10 text-center shadow-[0_6px_24px_rgba(0,0,0,0.08)] md:px-14 md:py-16 md:shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
        role="alert"
      >
        <p className="text-sm leading-[22px] text-destructive">
          문제가 생겼습니다. 다시 시도해주세요.
        </p>
      </section>
    );
  }

  const submitting = status === "submitting";

  return (
    <form
      className="flex w-full max-w-[600px] flex-col gap-[22px] rounded-[16px] border border-[#e6e6e6] bg-white px-6 py-8 shadow-[0_6px_24px_rgba(0,0,0,0.08)] md:gap-7 md:p-14 md:shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
      onSubmit={onSubmit}
    >
      <div className="flex flex-col items-center gap-2 text-center md:gap-2.5">
        <EnvelopeIcon />
        <h1 className="text-xl font-bold text-title md:text-2xl">협업 신청</h1>
        <p className="text-xs leading-normal text-body md:text-[13px]">
          어떤 목적으로 오셨는지, 무엇이 필요한지 알려주세요.
          <br />
          검토 후 연락드립니다.
        </p>
      </div>
      <div className="h-px w-full bg-[#e6e6e6]" />
      <label className="flex flex-col gap-1.5 md:gap-2">
        <span className="text-xs font-medium text-title md:text-[13px]">
          이름 / 소속
        </span>
        <Input
          name="name"
          required
          disabled={submitting}
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col gap-1.5 md:gap-2">
        <span className="text-xs font-medium text-title md:text-[13px]">
          연락처 (이메일)
        </span>
        <Input
          name="contact"
          type="email"
          required
          disabled={submitting}
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col gap-1.5 md:gap-2">
        <span className="text-xs font-medium text-title md:text-[13px]">
          방문 목적
        </span>
        <Input
          name="purpose"
          required
          disabled={submitting}
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col gap-1.5 md:gap-2">
        <span className="text-xs font-medium text-title md:text-[13px]">
          원하는 것
        </span>
        <Textarea
          name="want"
          required
          disabled={submitting}
          className={`${fieldClass} h-20 min-h-20 py-3 md:h-[90px] md:min-h-[90px]`}
        />
      </label>
      <label className="flex flex-col gap-1.5 md:gap-2">
        <span className="text-xs font-medium text-title md:text-[13px]">
          예산 / 가격대
        </span>
        <Input name="budget" disabled={submitting} className={fieldClass} />
      </label>
      <Button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="h-auto w-full rounded-lg bg-jaju px-5 py-2 text-[13px] font-bold text-white hover:bg-jaju/90 disabled:opacity-100"
      >
        {submitting ? (
          <>
            <span
              aria-hidden
              className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
            처리 중...
          </>
        ) : (
          "신청서 보내기"
        )}
      </Button>
    </form>
  );
}
