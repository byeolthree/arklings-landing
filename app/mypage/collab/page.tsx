import type { Metadata } from "next";
import Link from "next/link";
import { DeleteButton } from "@/components/delete-button";
import "@/components/planner/planner.css";
import "@/components/mypage/mypage.css";
import "@/components/register/register.css";
import { RegisterHeader } from "@/components/register/register-steps";
import { requireUser } from "@/lib/auth";
import { collabTargetOf, PAGE_SIZE, ROLES, type CollabRequest } from "@/lib/collab";
import { creatorNames } from "@/lib/creators";
import { formatKstDate } from "@/lib/time";
import { StatusBadge } from "@/components/status-badge";
import { createAuthClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "마이페이지 · 협업 신청", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// 협업 신청 화면(시안 13, D39): 받은 협업 신청(최근 것부터)과 보낸 협업 신청. 읽기는 로그인한 본인의 권한(RLS)으로만 한다.
export default async function MyCollabPage() {
  const user = await requireUser("/mypage/collab");

  let receivedRows: CollabRequest[] = [];
  let receivedTotal = 0;
  let receivedFailed = false;
  try {
    const { data, count, error } = await (await createAuthClient())
      .from("collab_requests")
      .select("*, source_works(title), plans(title)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);
    if (error) receivedFailed = true;
    else {
      receivedRows = (data ?? []) as CollabRequest[];
      receivedTotal = count ?? 0;
    }
  } catch {
    receivedFailed = true;
  }

  let sentRows: CollabRequest[] = [];
  let sentUnavailable = false;
  try {
    const { data, error } = await (await createAuthClient())
      .from("collab_requests")
      .select("id, status, roles, created_at, plan_id, work_title, creator_handle, source_works(title), plans(title), collab_replies(message, decision, created_at)")
      .eq("applicant_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) sentUnavailable = true;
    else sentRows = (data ?? []) as unknown as CollabRequest[];
  } catch {
    sentUnavailable = true;
  }
  const names = await creatorNames([...receivedRows, ...sentRows].map((r) => r.creator_handle));

  return (
    <div className="mp rg">
      <RegisterHeader current="협업 신청" />
      <div className="rg-main bs-main">
        <div className="bs-wrap">
          <div className="bs-card cl-card">
            <h2 className="cl-h">받은 협업 신청</h2>
            {receivedFailed ? (
              <p role="alert" className="mp-msg err">받은 협업 신청을 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.</p>
            ) : receivedRows.length === 0 ? (
              <p className="cl-empty">아직 받은 협업 신청이 없습니다.</p>
            ) : (
              <ul className="cl-list">
                {receivedRows.map((r) => (
                  <li key={r.id} className="cl-row">
                    <div className="cl-main">
                      <p className="cl-name">{r.applicant_name}</p>
                      <p className="cl-meta">
                        {collabTargetOf(r, names).text} · {r.roles.map((x) => ROLES[x]).join(", ")} · {formatKstDate(r.created_at).replace(/ KST$/, "")}
                      </p>
                    </div>
                    <div className="cl-side">
                      <StatusBadge status={r.status} />
                      <Link href={`/collab/${r.id}`} className="cl-open">열기</Link>
                      <DeleteButton id={r.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {receivedTotal > receivedRows.length && (
              <p className="cl-more">
                총 {receivedTotal}건 중 최근 {receivedRows.length}건입니다. <Link href="/collab">전체 보기</Link>
              </p>
            )}

            <hr className="cl-hr" />
            <h2 className="cl-h">보낸 협업 신청</h2>
            {sentUnavailable ? (
              <p className="cl-empty">보낸 협업 신청을 보여 주는 기능은 준비 중이에요.</p>
            ) : sentRows.length === 0 ? (
              <p className="cl-empty">로그인하고 보낸 협업 신청이 아직 없어요. 로그인 없이 보낸 신청은 여기에 나타나지 않아요.</p>
            ) : (
              <ul className="cl-list">
                {sentRows.map((r) => {
                  const replies = [...(r.collab_replies ?? [])].sort((x, y) => x.created_at.localeCompare(y.created_at));
                  return (
                    <li key={r.id} className="cl-row">
                      <div className="cl-main">
                        <p className="cl-name">{collabTargetOf(r, names).text}</p>
                        <p className="cl-meta">
                          {r.roles.map((x) => ROLES[x]).join(", ")} · {formatKstDate(r.created_at).replace(/ KST$/, "")}
                        </p>
                        {replies.map((p, i) => (
                          <p key={i} className="cl-meta" style={{ whiteSpace: "pre-wrap" }}>
                            답장 ({formatKstDate(p.created_at).replace(/ KST$/, "")}){p.decision === "accepted" ? " · 수락" : p.decision === "rejected" ? " · 거절" : ""}
                            {p.message ? `: ${p.message}` : ""}
                          </p>
                        ))}
                      </div>
                      <div className="cl-side">
                        <StatusBadge status={r.status} />
                        <Link href={`/mypage/collab/${r.id}`} className="cl-open">열기</Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
