"use client";

import Link from "next/link";
import { useActionState } from "react";
import { unlockGate, type GateState } from "@/app/actions/gate";
import { CardHeading, PaperCard, primaryBtn } from "@/components/paper-card";

export function GateForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<GateState, FormData>(unlockGate, {});
  return (
    <PaperCard>
      <CardHeading title="운영자 확인" lines={["협업 신청 목록은 아클링스 운영자만 볼 수 있습니다.", "운영자용 비밀번호를 입력해 주세요."]} />
      <form action={action} className="mt-6 flex flex-col gap-4 md:mt-8">
        <input type="hidden" name="next" value={next} />
        <div className="flex flex-col gap-1.5 md:gap-2">
          <label htmlFor="gate-password" className="text-[12px] font-medium text-[#292126] md:text-[13px]">
            운영자용 비밀번호
          </label>
          <input
            id="gate-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={pending}
            aria-invalid={state.message ? true : undefined}
            aria-describedby={state.message ? "gate-error" : undefined}
            className="h-10 w-full rounded-lg border border-[#e8dfe3] bg-[#faf7f8] px-[11px] text-[13px] font-medium text-[#292126] outline-none focus:border-jaju disabled:opacity-60 md:h-11"
          />
          {state.message && (
            <p id="gate-error" role="alert" className="text-[12px] text-destructive">
              {state.message}
            </p>
          )}
        </div>
        <button type="submit" disabled={pending} className={`${primaryBtn} w-full`}>
          {pending ? "확인 중…" : "열기"}
        </button>
        <Link href="/collab/new" className="text-center text-[12px] text-[#6f6469] hover:text-jaju">
          협업 신청하러 가기
        </Link>
      </form>
    </PaperCard>
  );
}
