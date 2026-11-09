import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "@/components/planner/planner.css";
import "@/components/mypage/mypage.css";
import "@/components/register/register.css";
import { RegisterHeader } from "@/components/register/register-steps";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { collabTargetOf, ROLES, UUID_RE, type CollabRequest } from "@/lib/collab";
import { creatorNames } from "@/lib/creators";
import { createAuthClient } from "@/lib/supabase/server";
import { formatKst } from "@/lib/time";

export const metadata: Metadata = { title: "보낸 협업 신청", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr]">
      <dt className="text-[13px] text-[#574a4f]">{k}</dt>
      <dd className="text-[14px] text-[#292126]">{children}</dd>
    </div>
  );
}

// 내가 보낸 협업 신청을 보기만 하는 화면(별뜨리님 추가 지시). 고치기·지우기·상태 바꾸기·답장 쓰기는 없다.
// 로그인한 본인의 연결로 「내가 보낸 것」만 읽는다. 남의 신청이나 없는 번호는 404.
export default async function SentCollabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/mypage/collab/${UUID_RE.test(id) ? id : ""}`);
  if (!UUID_RE.test(id)) notFound();

  const sb = await createAuthClient();
  const { data, error } = await sb
    .from("collab_requests")
    .select("*, source_works(title), plans(title), collab_replies(message, decision, created_at)")
    .eq("id", id)
    .eq("applicant_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();
  const r = data as unknown as CollabRequest;
  const target = collabTargetOf(r, await creatorNames([r.creator_handle]));
  const replies = [...(r.collab_replies ?? [])].sort((x, y) => x.created_at.localeCompare(y.created_at));

  return (
    <div className="mp rg">
      <RegisterHeader current="협업 신청" />
      <div className="rg-main bs-main">
        <div className="bs-wrap">
          <div className="bs-card">
            <Link href="/mypage/collab" className="text-[13px] text-jaju">← 협업 신청</Link>
            <div className="mt-4 flex items-center justify-between gap-4">
              <h2 className="text-[20px] font-bold text-[#292126] md:text-[24px]">{target.text}</h2>
              <StatusBadge status={r.status} />
            </div>
            <dl className="mt-4 divide-y divide-[#e8dfe3] border-y border-[#e8dfe3]">
              <Row k="연락처">{r.contact}</Row>
              <Row k="SNS 아이디">{r.sns_handle}</Row>
              {target.kind === "plan" ? (
                <Row k="신청 기획안">{r.plans?.title ?? "제목을 불러오지 못했어요"}</Row>
              ) : target.kind === "work" ? (
                <Row k="신청 작품">{r.work_title}</Row>
              ) : target.kind === "creator" ? (
                <Row k="신청 크리에이터">{target.text}</Row>
              ) : (
                <Row k="신청 대상">{r.source_works?.title ?? "특정 이야기 아님 (전체적인 협업 제안)"}</Row>
              )}
              <Row k="역할">{r.roles.map((x) => ROLES[x]).join(" · ")}</Row>
              <Row k="하고 싶은 일 / 아이디어">
                <span className="whitespace-pre-wrap">{r.idea}</span>
              </Row>
              <Row k="작업 링크">
                <span className="break-all">{r.portfolio_url}</span>
              </Row>
              <Row k="첨부 파일">{r.attachment_name ? r.attachment_name : <span className="text-[#574a4f]">첨부된 파일이 없습니다.</span>}</Row>
              <Row k="신청일">{formatKst(r.created_at)}</Row>
              <Row k="받은 답장">
                {replies.length === 0 ? (
                  <span className="text-[#574a4f]">아직 받은 답장이 없어요.</span>
                ) : (
                  <ul className="grid gap-3">
                    {replies.map((p, i) => (
                      <li key={i} className="whitespace-pre-wrap">
                        <span className="text-[13px] text-[#574a4f]">
                          {formatKst(p.created_at)}
                          {p.decision === "accepted" ? " · 수락" : p.decision === "rejected" ? " · 거절" : ""}
                        </span>
                        {p.message ? <span className="block">{p.message}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Row>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
