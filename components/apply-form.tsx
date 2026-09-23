"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const SUBMIT_DELAY_MS = 800;

type Status = "idle" | "submitting" | "success" | "error";

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
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
      <p className="text-sm leading-[22px] text-title" role="status">
        신청이 접수됐습니다. 마이페이지에서 확인하실 수 있습니다.
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="text-sm leading-[22px] text-destructive" role="alert">
        문제가 생겼습니다. 다시 시도해주세요.
      </p>
    );
  }

  const submitting = status === "submitting";

  return (
    <form className="flex w-full flex-col gap-4 md:gap-5" onSubmit={onSubmit}>
      <label className="flex flex-col gap-1.5 md:gap-2">
        <span className="text-xs font-medium leading-4 text-title">이름 / 소속</span>
        <Input
          name="name"
          required
          disabled={submitting}
          className="h-11 rounded-[6px] border-border bg-background px-3 text-sm md:h-12"
        />
      </label>
      <label className="flex flex-col gap-1.5 md:gap-2">
        <span className="text-xs font-medium leading-4 text-title">
          연락처 (이메일)
        </span>
        <Input
          name="contact"
          type="email"
          required
          disabled={submitting}
          className="h-11 rounded-[6px] border-border bg-background px-3 text-sm md:h-12"
        />
      </label>
      <label className="flex flex-col gap-1.5 md:gap-2">
        <span className="text-xs font-medium leading-4 text-title">
          <span className="md:hidden">방문 목적</span>
          <span className="hidden md:inline">
            방문 목적 (자기 이야기 발전 / 아클링스 작품 참여 / 기타)
          </span>
        </span>
        <Input
          name="purpose"
          required
          disabled={submitting}
          className="h-11 rounded-[6px] border-border bg-background px-3 text-sm md:h-12"
        />
      </label>
      <label className="flex flex-col gap-1.5 md:gap-2">
        <span className="text-xs font-medium leading-4 text-title">
          <span className="md:hidden">원하는 것</span>
          <span className="hidden md:inline">
            원하는 것 (스토리·자료·영상 협업 등 자유 서술)
          </span>
        </span>
        <Textarea
          name="want"
          required
          disabled={submitting}
          className="min-h-[100px] rounded-[6px] border-border bg-background px-3 py-3 text-sm md:min-h-[120px]"
        />
      </label>
      <label className="flex flex-col gap-1.5 md:gap-2">
        <span className="text-xs font-medium leading-4 text-title">예산/가격대</span>
        <Input
          name="budget"
          disabled={submitting}
          className="h-11 rounded-[6px] border-border bg-background px-3 text-sm md:h-12"
        />
      </label>
      <Button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="h-12 w-full rounded-[6px] bg-jaju py-3.5 text-[15px] font-medium leading-5 text-white hover:bg-jaju/90 disabled:opacity-100 md:h-[54px] md:py-4 md:text-base md:leading-[22px]"
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
          "신청서 제출하기"
        )}
      </Button>
    </form>
  );
}
