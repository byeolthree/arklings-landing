"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/collab";
import { CardHeading, PaperCard, primaryBtn } from "@/components/paper-card";
import {
  NO_TARGET_LABEL,
  ROLES,
  STATUSES,
  type CollabRequest,
  type Role,
  type SourceWork,
} from "@/lib/collab";

type Props = {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  works: SourceWork[];
  initial?: CollabRequest;
  cancelHref: string;
};

// Figma 입력창: 배경 #faf7f8, 테두리 #e8dfe3, 모서리 8px, 높이 44(모바일 40), 글자 13(모바일 12)
const inputCls =
  "w-full rounded-lg border border-[#e8dfe3] bg-[#faf7f8] px-[11px] text-[12px] font-medium text-[#292126] outline-none placeholder:text-[#8c8c8c] focus:border-jaju disabled:opacity-60 md:text-[13px] aria-invalid:border-destructive";

function Field({
  label,
  required,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 md:gap-2">
      <label htmlFor={htmlFor} className="text-[12px] font-medium text-[#292126] md:text-[13px]">
        {label} {required && <span className="text-jaju">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[12px] font-medium text-[#8c8c8c] md:text-[13px]">{hint}</p>}
      {error && (
        <p role="alert" className="text-[12px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function CollabForm({ action, works, initial, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const e = state.errors ?? {};
  const v = (k: string, fallback = "") => state.values?.[k] ?? fallback;

  const initialRoles = state.values
    ? (state.values.roles ?? "").split(",").filter(Boolean)
    : (initial?.roles ?? []);
  const [target, setTarget] = useState(v("source_work_id", initial?.source_work_id ?? ""));
  const editing = !!initial;

  return (
    <PaperCard>
      <CardHeading
        title={editing ? "협업 신청 수정" : "협업 신청"}
        lines={
          editing
            ? ["내용을 고치고 상태를 바꿀 수 있습니다."]
            : ["어떤 목적으로 오셨는지, 무엇이 필요한지 알려주세요.", "검토 후 연락드립니다."]
        }
      />
      <div className="my-[22px] h-px bg-[#e6e6e6] md:my-7" />

      <form action={formAction} noValidate className="flex flex-col gap-[22px] md:gap-7">
        {state.message && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {state.message}
          </p>
        )}

        <Field label="이름 / 닉네임" required error={e.applicant_name} htmlFor="applicant_name">
          <input id="applicant_name" name="applicant_name" placeholder="예: 아클링스" defaultValue={v("applicant_name", initial?.applicant_name)} aria-invalid={!!e.applicant_name} disabled={pending} className={`${inputCls} h-10 md:h-11`} />
        </Field>

        <Field label="연락처 (이메일 또는 전화번호)" required error={e.contact} htmlFor="contact">
          <input id="contact" name="contact" placeholder="example@email.com 또는 010-0000-0000" defaultValue={v("contact", initial?.contact)} aria-invalid={!!e.contact} disabled={pending} className={`${inputCls} h-10 md:h-11`} />
        </Field>

        <Field label="SNS 아이디" required error={e.sns_handle} htmlFor="sns_handle">
          <input id="sns_handle" name="sns_handle" placeholder="연락이 잘 되는 SNS 아이디를 적어주세요" defaultValue={v("sns_handle", initial?.sns_handle)} aria-invalid={!!e.sns_handle} disabled={pending} className={`${inputCls} h-10 md:h-11`} />
        </Field>

        <Field label="신청 대상" required error={e.source_work_id} htmlFor="source_work_id">
          <div className="relative">
            <select id="source_work_id" name="source_work_id" value={target} onChange={(ev) => setTarget(ev.target.value)} disabled={pending} className={`${inputCls.replace("text-[#292126]", target ? "text-[#292126]" : "text-[#8c8c8c]")} h-10 appearance-none pr-9 md:h-11`}>
              <option value="">{NO_TARGET_LABEL}</option>
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
            <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#8c8c8c]">⌄</span>
          </div>
        </Field>

        <fieldset className="flex flex-col gap-2" disabled={pending}>
          <legend className="mb-2 text-[12px] font-medium text-[#292126] md:text-[13px]">
            역할 <span className="text-jaju">*</span>
          </legend>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {(Object.keys(ROLES) as Role[]).map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-1.5 rounded-[20px] border border-[#e8dfe3] bg-[#faf7f8] px-2.5 py-2 text-[12px] font-medium text-[#6f6469] has-[input:checked]:border-jaju has-[input:checked]:text-[#292126] md:text-[13px]">
                <input type="checkbox" name="roles" value={r} defaultChecked={initialRoles.includes(r)} className="peer sr-only" />
                <span aria-hidden className="grid size-[14px] shrink-0 place-items-center rounded-[3px] border border-[#d9d9d9] bg-white text-[10px] leading-none text-transparent peer-checked:border-jaju peer-checked:bg-jaju peer-checked:text-white">✓</span>
                {ROLES[r]}
              </label>
            ))}
          </div>
          {e.roles ? (
            <p role="alert" className="text-[12px] text-destructive">{e.roles}</p>
          ) : (
            <p className="text-[12px] font-medium text-[#8c8c8c] md:text-[13px]">중복 선택 가능</p>
          )}
        </fieldset>

        <Field label="하고 싶은 일 / 아이디어" required error={e.idea} htmlFor="idea">
          <textarea id="idea" name="idea" placeholder="자유양식으로 적어주세요" defaultValue={v("idea", initial?.idea)} aria-invalid={!!e.idea} disabled={pending} className={`${inputCls} h-20 resize-none py-[11px] md:h-[90px]`} />
        </Field>

        <Field label="작업 링크" required error={e.portfolio_url} htmlFor="portfolio_url">
          <input id="portfolio_url" name="portfolio_url" placeholder="포트폴리오, 작업물 URL" defaultValue={v("portfolio_url", initial?.portfolio_url)} aria-invalid={!!e.portfolio_url} disabled={pending} className={`${inputCls} h-10 md:h-11`} />
        </Field>

        <Field label="작업 파일 첨부 (선택)" error={e.attachment} hint="PDF, JPG, PNG · 4MB 이하" htmlFor="attachment">
          <input id="attachment" name="attachment" type="file" accept="application/pdf,image/jpeg,image/png" disabled={pending} className={`${inputCls} py-2 file:mr-3 file:rounded-md file:border file:border-[#e8dfe3] file:bg-white file:px-3 file:py-1 file:text-[12px] file:font-medium`} />
          {initial?.attachment_path && (
            <label className="flex items-center gap-2 text-[12px] text-[#6f6469]">
              <input type="checkbox" name="remove_attachment" disabled={pending} />
              현재 파일({initial.attachment_name})을 지웁니다. 새 파일을 고르면 교체됩니다.
            </label>
          )}
        </Field>

        {editing && (
          <Field label="상태" required error={e.status} htmlFor="status">
            <select id="status" name="status" defaultValue={v("status", initial?.status)} disabled={pending} className={`${inputCls} h-10 md:h-11`}>
              {Object.entries(STATUSES).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-2 text-[12px] font-medium text-[#6f6469] md:text-[13px]">
            <input type="checkbox" name="consent" defaultChecked={v("consent", editing ? "on" : "") === "on"} disabled={pending} className="mt-0.5 size-4 shrink-0 accent-[#a61e5c]" />
            <span>
              신청 내용은 연락 및 검토 목적으로만 보관됩니다.<span className="block md:inline"> 개인정보 수집·이용에 동의합니다.</span>
            </span>
          </label>
          {e.consent && <p role="alert" className="text-[12px] text-destructive">{e.consent}</p>}
        </div>

        <button type="submit" disabled={pending} className={`${primaryBtn} w-full`}>
          {pending ? "저장 중…" : editing ? "수정 저장" : "신청서 보내기"}
        </button>
        <Link href={cancelHref} className="-mt-3 text-center text-[12px] text-[#6f6469] hover:text-jaju md:-mt-4">
          취소
        </Link>
      </form>
    </PaperCard>
  );
}
