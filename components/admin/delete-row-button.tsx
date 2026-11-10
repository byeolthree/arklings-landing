"use client";

import { useActionState } from "react";
import { adminDeleteLog, type AdminDeleteState } from "@/app/actions/admin";

// 운영자 표의 줄마다 보이는 「삭제」. real이 true면 아클링스 앞 신청이라 실제 신청과 첨부 파일이 지워진다.
// false면 남에게 온 신청이라 운영자 목록에서만 치운다(받은 사람의 신청과 지표 기록은 그대로).
export function DeleteRowButton({ id, real }: { id: string; real: boolean }) {
  const [state, action, pending] = useActionState<AdminDeleteState, FormData>(() => adminDeleteLog(id), {});
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        const ok = confirm(
          real
            ? "이 신청을 삭제할까요? 신청과 첨부 파일이 실제로 지워지고 되돌릴 수 없어요."
            : "이 줄을 운영자 목록에서 치울까요? 받은 사람의 신청은 지워지지 않고, 지표에는 계속 세요.",
        );
        if (!ok) ev.preventDefault();
      }}
    >
      <button
        type="submit"
        disabled={pending}
        aria-label={real ? "신청 삭제" : "목록에서 삭제"}
        className="inline-flex items-center justify-center rounded-lg border-[1.5px] border-destructive px-3 py-1.5 text-[12px] font-bold text-destructive transition-[transform,background-color] duration-150 hover:not-disabled:-translate-y-px active:not-disabled:scale-[0.97] active:not-disabled:bg-destructive/10 disabled:opacity-60"
      >
        {pending ? "삭제 중…" : "삭제"}
      </button>
      {state.message && (
        <p role="alert" className="mt-1 text-[11px] leading-4 text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}
