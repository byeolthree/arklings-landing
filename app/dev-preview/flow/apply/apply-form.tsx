"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CardHeading, PaperCard, primaryBtn } from "@/components/paper-card";
import { ROLES, type Role } from "@/lib/collab";

// 지금 협업 신청 화면(components/collab-form.tsx)과 같은 모양(카드·글자·칸)이고, 미리 채워지는 것만 보여 주는 샘플이다.
// 실제 신청 화면과 데이터는 건드리지 않고 아무것도 저장하지 않는다. 「보내기」는 샘플 「보낸 신청」으로 간다.
const inputCls =
  "w-full rounded-lg border border-[#e8dfe3] bg-[#faf7f8] px-[11px] text-[12px] font-medium text-[#292126] outline-none placeholder:text-[#8c8c8c] focus:border-jaju md:text-[13px]";

export function ApplyForm({ creator, creatorName, plan, defaultRole }: { creator: string; creatorName: string; plan?: { id: string; title: string }; defaultRole?: Role }) {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [contact, setContact] = useState("");
  const [err, setErr] = useState<{ idea?: string; contact?: string }>({});
  const [roles, setRoles] = useState<Role[]>(defaultRole ? [defaultRole] : []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof err = {};
    if (!idea.trim()) next.idea = "하고 싶은 일을 적어 주세요.";
    if (!contact.trim()) next.contact = "연락처를 적어 주세요.";
    setErr(next);
    if (next.idea || next.contact) return;
    const p = new URLSearchParams({ new: creator });
    if (plan) p.set("plan", plan.id);
    if (roles[0]) p.set("role", roles[0]);
    router.push(`/dev-preview/flow/sent?${p.toString()}`);
  }

  return (
    <PaperCard>
      <CardHeading title="협업 신청" lines={["어떤 목적으로 오셨는지, 무엇이 필요한지 알려주세요.", "검토 후 연락드립니다."]} />
      <div className="my-[22px] h-px bg-[#e6e6e6] md:my-7" />
      <form onSubmit={submit} noValidate className="flex flex-col gap-[22px] md:gap-7">
        {/* 미리 채워진 칸: 받는 크리에이터, 보고 온 기획안(있으면), 역할 */}
        <div className="flex flex-col gap-1.5 md:gap-2">
          <p className="text-[12px] font-medium text-[#292126] md:text-[13px]">받는 크리에이터</p>
          <div className="rounded-lg border border-[#e8dfe3] bg-[#f5ecf0] px-[11px] py-3">
            <p className="text-[13px] font-bold text-[#292126] md:text-[14px]">{creatorName}</p>
            <p className="mt-1 text-[12px] text-[#574a4f] md:text-[13px]">{creatorName}님께 전달됩니다</p>
          </div>
        </div>
        {plan && (
          <div className="flex flex-col gap-1.5 md:gap-2">
            <p className="text-[12px] font-medium text-[#292126] md:text-[13px]">신청 대상 기획안</p>
            <div className="rounded-lg border border-[#e8dfe3] bg-[#f5ecf0] px-[11px] py-3">
              <p className="text-[13px] font-bold text-[#292126] md:text-[14px]">{plan.title}</p>
            </div>
          </div>
        )}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[12px] font-medium text-[#292126] md:text-[13px]">
            역할 <span className="text-jaju">*</span>
          </legend>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {(Object.keys(ROLES) as Role[]).map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-1.5 rounded-[20px] border border-[#e8dfe3] bg-[#faf7f8] px-2.5 py-2 text-[12px] font-medium text-[#6f6469] has-[input:checked]:border-jaju has-[input:checked]:text-[#292126] md:text-[13px]">
                <input type="checkbox" checked={roles.includes(r)} onChange={() => setRoles(roles.includes(r) ? roles.filter((x) => x !== r) : [...roles, r])} className="peer sr-only" />
                <span aria-hidden className="grid size-[14px] shrink-0 place-items-center rounded-[3px] border border-[#d9d9d9] bg-white text-[10px] leading-none text-transparent peer-checked:border-jaju peer-checked:bg-jaju peer-checked:text-white">✓</span>
                {ROLES[r]}
              </label>
            ))}
          </div>
          <p className="text-[12px] font-medium text-[#8c8c8c] md:text-[13px]">중복 선택 가능</p>
        </fieldset>

        {/* 신청자가 적는 것은 아래 두 칸뿐 */}
        <div className="flex flex-col gap-1.5 md:gap-2">
          <label htmlFor="idea" className="text-[12px] font-medium text-[#292126] md:text-[13px]">
            하고 싶은 일 / 아이디어 <span className="text-jaju">*</span>
          </label>
          <textarea id="idea" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="자유양식으로 적어주세요" aria-invalid={!!err.idea} className={`${inputCls} h-20 resize-none py-[11px] md:h-[90px]`} />
          {err.idea && <p role="alert" className="text-[12px] text-destructive">{err.idea}</p>}
        </div>
        <div className="flex flex-col gap-1.5 md:gap-2">
          <label htmlFor="contact" className="text-[12px] font-medium text-[#292126] md:text-[13px]">
            연락처 (이메일 또는 전화번호) <span className="text-jaju">*</span>
          </label>
          <input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="example@email.com 또는 010-0000-0000" aria-invalid={!!err.contact} className={`${inputCls} h-10 md:h-11`} />
          {err.contact && <p role="alert" className="text-[12px] text-destructive">{err.contact}</p>}
        </div>

        <button type="submit" className={primaryBtn}>
          보내기
        </button>
      </form>
    </PaperCard>
  );
}
