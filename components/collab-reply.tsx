"use client";

import { useActionState } from "react";
import { replyCollab, type FormState } from "@/app/actions/collab";
import { outlineBtn } from "@/components/paper-card";

// 받은 신청에 답장을 보내거나 수락·거절한다. 글은 신청자 이메일로만 가고 사이트에는 저장되지 않는다.
export function CollabReply({ id, canMail }: { id: string; canMail: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>((prev, fd) => replyCollab(id, prev, fd), {});
  return (
    <form action={action} className="mt-6">
      <h2 className="text-[16px] font-bold text-[#292126]">답장</h2>
      <p className="mt-1 text-[12px] text-[#574a4f]">
        {canMail
          ? "쓴 글은 신청자의 이메일로 보내요. 사이트에는 저장되지 않아요."
          : "신청자의 연락처가 이메일이 아니라서 사이트에서 글을 보낼 수 없어요. 수락·거절만 표시할 수 있어요."}
      </p>
      <textarea
        name="message"
        rows={5}
        maxLength={1000}
        defaultValue={state.values?.message ?? ""}
        disabled={pending || !canMail}
        aria-label="답장 내용"
        className="mt-3 w-full rounded-md border border-[#e8dfe3] bg-white px-3 py-2 text-[14px] text-[#292126] disabled:bg-[#faf7f8]"
      />
      {state.message && (
        <p role="alert" className="mt-2 text-[12px] text-destructive">
          {state.message}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" name="decision" value="send" disabled={pending || !canMail} className="inline-flex items-center justify-center rounded-lg bg-jaju px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50">
          {pending ? "보내는 중…" : "답장 보내기"}
        </button>
        <button type="submit" name="decision" value="accept" disabled={pending} className={outlineBtn}>
          수락
        </button>
        <button type="submit" name="decision" value="reject" disabled={pending} className="inline-flex items-center justify-center rounded-lg border border-[#e8dfe3] px-5 py-2 text-[13px] font-bold text-[#574a4f]">
          거절
        </button>
      </div>
    </form>
  );
}
