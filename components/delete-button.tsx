"use client";

import { useActionState } from "react";
import { deleteCollab, type FormState } from "@/app/actions/collab";

export function DeleteButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(() => deleteCollab(id), {});
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (!confirm("이 협업 신청을 삭제할까요? 첨부 파일도 함께 지워지며 되돌릴 수 없습니다.")) ev.preventDefault();
      }}
    >
      <button type="submit" disabled={pending} className="inline-flex items-center justify-center rounded-lg border border-[#e8dfe3] px-5 py-2 text-[13px] font-bold text-destructive hover:bg-destructive/10 disabled:opacity-60">
        {pending ? "삭제 중…" : "삭제"}
      </button>
      {state.message && (
        <p role="alert" className="mt-2 text-[12px] text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}
