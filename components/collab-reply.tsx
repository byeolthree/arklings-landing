"use client";

import { useActionState } from "react";
import { replyCollab, type FormState } from "@/app/actions/collab";
import { outlineBtn } from "@/components/paper-card";

// 받은 신청에 답장을 보내거나 검토 중·수락·거절로 바꾼다. 글은 신청자 이메일로만 가고 사이트에는 저장되지 않는다.
// 검토 중·수락·거절·삭제(children)는 답장 위에 가운데 정렬로 놓고(form 속성으로 글칸에 연결), 「답장 보내기」만 글칸 아래 오른쪽에 둔다.
export function CollabReply({ id, canMail, onSite, children }: { id: string; canMail: boolean; onSite: boolean; children?: React.ReactNode }) {
  const canSend = canMail || onSite;
  const [state, action, pending] = useActionState<FormState, FormData>((prev, fd) => replyCollab(id, prev, fd), {});
  const formId = `collab-reply-${id}`;
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-start justify-center gap-2">
        <button type="submit" form={formId} name="decision" value="review" disabled={pending} className={outlineBtn}>
          검토 중
        </button>
        <button type="submit" form={formId} name="decision" value="accept" disabled={pending} className={outlineBtn}>
          수락
        </button>
        <button type="submit" form={formId} name="decision" value="reject" disabled={pending} className="inline-flex items-center justify-center rounded-lg border border-[#e8dfe3] px-5 py-2 text-[13px] font-bold text-[#574a4f]">
          거절
        </button>
        {children}
      </div>
      <form id={formId} action={action} className="mt-6">
        <h2 className="text-[16px] font-bold text-[#292126]">답장</h2>
        <textarea
          name="message"
          rows={5}
          maxLength={1000}
          defaultValue={state.values?.message ?? ""}
          disabled={pending || !canSend}
          aria-label="답장 내용"
          className="mt-3 w-full rounded-md border border-[#e8dfe3] bg-white px-3 py-2 text-[14px] text-[#292126] disabled:bg-[#faf7f8]"
        />
        {state.message && (
          <p role="alert" className="mt-2 text-right text-[12px] text-destructive">
            {state.message}
          </p>
        )}
        <div className="mt-3 flex items-start justify-between gap-4">
          <p className="min-w-0 flex-1 text-left text-[12px] leading-[1.6] text-[#574a4f]">
            {onSite && canMail
              ? "신청자가 로그인하고 보낸 신청이에요. 쓴 글은 신청자의 이메일로 보내고 사이트에도 남아요."
              : onSite
                ? "신청자가 로그인하고 보낸 신청이에요. 연락처가 이메일이 아니라서 글은 사이트에만 남아요."
                : canMail
                  ? "로그인 없이 보낸 신청이에요. 쓴 글은 신청자의 이메일로만 보내고 사이트에는 남지 않아요."
                  : "로그인 없이 보냈고 연락처도 이메일이 아니라서 사이트에서 글을 보낼 수 없어요. 검토 중·수락·거절만 표시할 수 있어요."}
          </p>
          <button type="submit" name="decision" value="send" disabled={pending || !canSend} className="inline-flex shrink-0 items-center justify-center rounded-lg bg-jaju px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50">
            {pending ? "처리 중…" : "답장 보내기"}
          </button>
        </div>
      </form>
    </div>
  );
}
