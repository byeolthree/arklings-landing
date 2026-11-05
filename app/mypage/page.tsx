import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { startLinkIdentity, unlinkProvider } from "@/app/actions/social";
import { DisplayNameForm } from "@/components/mypage-forms";
import "@/components/planner/planner.css";
import "@/components/mypage/mypage.css";
import { MypagePreview } from "@/components/mypage/mypage-preview";
import { requireUser } from "@/lib/auth";
import { countNewCollab } from "@/lib/collab-count";
import { PAGE_SIZE, ROLES, STATUSES, type CollabRequest } from "@/lib/collab";
import { formatKstDate } from "@/lib/time";
import { StatusBadge } from "@/components/status-badge";
import { createAuthClient } from "@/lib/supabase/server";
import { OAUTH_PROVIDERS, PROVIDER_LABEL } from "@/lib/providers";
import { formatKst } from "@/lib/time";

export const metadata: Metadata = { title: "마이페이지", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { text: string; ok?: boolean }> = {
  linked: { text: "로그인 방법을 추가했어요.", ok: true },
  unlinked: { text: "로그인 방법을 해제했어요.", ok: true },
  password_set: { text: "비밀번호를 저장했어요. 이제 이메일로도 로그인할 수 있어요.", ok: true },
  link_failed: { text: "로그인 방법을 바꾸지 못했어요. 잠시 뒤에 다시 시도해 주세요." },
  link_disabled: { text: "로그인 방법 추가·해제는 지금 준비 중이에요. 잠시 뒤에 다시 시도해 주세요." },
  link_none: { text: "이어 줄 요청이 없거나 시간이 지났어요. 카카오 화면에서 다시 시도해 주세요." },
  unlink_failed: { text: "로그인 방법을 해제하지 못했어요. 잠시 뒤에 다시 시도해 주세요." },
  unlink_last: { text: "로그인 방법이 하나뿐이라 해제할 수 없어요. 다른 방법을 먼저 추가해 주세요." },
};

export default async function MyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/mypage");
  const msgKey = (await searchParams).msg;
  const banner = typeof msgKey === "string" ? MESSAGES[msgKey] : undefined;

  let displayName = "";
  let profileLoadFailed = false;
  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    if (error) profileLoadFailed = true;
    else displayName = data?.display_name ?? "";
  } catch {
    profileLoadFailed = true;
  }

  // 내 기획안 목록(내 것만). 불러오지 못해도 마이페이지의 다른 부분은 그대로 보여 준다.
  type PlanRow = { id: string; title: string; is_public: boolean; updated_at: string };
  let plans: PlanRow[] = [];
  let plansLoadFailed = false;
  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase
      .from("plans")
      .select("id, title, is_public, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(30);
    if (error) plansLoadFailed = true;
    else plans = (data ?? []) as PlanRow[];
  } catch {
    plansLoadFailed = true;
  }

  const newCollab = await countNewCollab();

  // 받은 협업 신청 목록(최근 것부터). 로그인한 본인의 권한으로 읽어 DB 규칙(RLS)이 내게 온 신청만 돌려준다.
  let collabRows: CollabRequest[] = [];
  let collabTotal = 0;
  let collabLoadFailed = false;
  try {
    const { data, count, error } = await (await createAuthClient())
      .from("collab_requests")
      .select("*, source_works(title), plans(title)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);
    if (error) collabLoadFailed = true;
    else {
      collabRows = (data ?? []) as CollabRequest[];
      collabTotal = count ?? 0;
    }
  } catch {
    collabLoadFailed = true;
  }
  const receivedBlock = collabLoadFailed ? (
    <div className="mp-plans">
      <h3>받은 협업 신청</h3>
      <p role="alert" className="mp-msg err">
        받은 협업 신청을 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.
      </p>
    </div>
  ) : collabRows.length === 0 ? (
    <div className="mp-plans">
      <h3>받은 협업 신청</h3>
      <p className="mp-note">아직 받은 협업 신청이 없습니다.</p>
    </div>
  ) : (
    <div className="mp-plans">
      <h3>받은 협업 신청</h3>
      <ul>
        {collabRows.map((r) => (
          <li key={r.id}>
            <span>{r.applicant_name}</span>
            <span>
              {r.plan_id ? `기획안 「${r.plans?.title ?? "제목 없음"}」` : (r.source_works?.title ?? "전체 협업 제안")} · {r.roles.map((x) => ROLES[x]).join(", ")} · {formatKstDate(r.created_at)} · {STATUSES[r.status]} · <Link href={`/collab/${r.id}`}>열기</Link>
            </span>
          </li>
        ))}
      </ul>
      {collabTotal > collabRows.length && (
        <p className="mp-note" style={{ marginTop: 8 }}>
          총 {collabTotal}건 중 최근 {collabRows.length}건입니다. <Link href="/collab" style={{ textDecoration: "underline" }}>전체 보기</Link>
        </p>
      )}
    </div>
  );

  // 로그인 방법: 이미 쓰는 것(해제 가능) / 더할 수 있는 것(추가). 방법은 항상 1개 이상 남는다.
  const linked = Array.from(new Set(user.providers));
  const methods = linked.map((p) => PROVIDER_LABEL[p] ?? p);
  const addable = OAUTH_PROVIDERS.filter((p) => !linked.includes(p.id));

  // 보낸 협업 신청: 로그인하고 보낸 신청만 내 것으로 가려낼 수 있다(신청자 번호는 0008 SQL이 만든다). 로그인 없이 보낸 신청은 알 수 없다.
  let sentRows: CollabRequest[] = [];
  let sentUnavailable = false;
  try {
    const { data, error } = await (await createAuthClient())
      .from("collab_requests")
      .select("id, status, roles, created_at, plan_id, source_works(title), plans(title), collab_replies(message, decision, created_at)")
      .eq("applicant_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) sentUnavailable = true;
    else sentRows = (data ?? []) as unknown as CollabRequest[];
  } catch {
    sentUnavailable = true;
  }
  const sentBlock = (
    <div className="mp-plans">
      <h3>보낸 협업 신청</h3>
      {sentUnavailable ? (
        <p className="mp-note">보낸 협업 신청을 보여 주는 기능은 준비 중이에요.</p>
      ) : sentRows.length === 0 ? (
        <p className="mp-note">로그인하고 보낸 협업 신청이 아직 없어요. 로그인 없이 보낸 신청은 여기에 나타나지 않아요.</p>
      ) : (
        <ul>
          {sentRows.map((r) => {
            const replies = [...(r.collab_replies ?? [])].sort((x, y) => x.created_at.localeCompare(y.created_at));
            return (
              <li key={r.id}>
                <span>
                  {r.plan_id ? `기획안 「${r.plans?.title ?? "제목 없음"}」` : (r.source_works?.title ?? "전체 협업 제안")} · {r.roles.map((x) => ROLES[x]).join(", ")} · {formatKstDate(r.created_at)}
                </span>
                <StatusBadge status={r.status} />
                {replies.length > 0 && (
                  <div style={{ width: "100%" }}>
                    {replies.map((p, i) => (
                      <p key={i} className="mp-note" style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>
                        답장 ({formatKstDate(p.created_at)}){p.decision === "accepted" ? " · 수락" : p.decision === "rejected" ? " · 거절" : ""}
                        {p.message ? `: ${p.message}` : ""}
                      </p>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
  const collabList = (
    <>
      {receivedBlock}
      {sentBlock}
    </>
  );

  const basic = (
    <>
      {banner && (
        <p role={banner.ok ? "status" : "alert"} className={`mp-msg ${banner.ok ? "ok" : "err"}`}>
          {banner.text}
        </p>
      )}
      <dl className="mp-rows">
        <div className="mp-row">
          <dt>닉네임</dt>
          <dd>
            {profileLoadFailed ? (
              <p role="alert" className="mp-msg err">
                프로필을 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.
              </p>
            ) : (
              <DisplayNameForm initial={displayName} />
            )}
          </dd>
        </div>
        <div className="mp-row">
          <dt>로그인 방법</dt>
          <dd>{methods.length > 0 ? methods.join(" · ") : "-"}</dd>
        </div>
        <div className="mp-row">
          <dt>방법 추가·해제</dt>
          <dd>
            <div className="mp-btns">
              {addable.map((p) => (
                <form key={p.id} action={startLinkIdentity}>
                  <input type="hidden" name="provider" value={p.id} />
                  <button type="submit" className="btn btn-ghost">
                    {p.label} 연결하기
                  </button>
                </form>
              ))}
              {!linked.includes("email") && (
                <Link href={`/forgot-password${user.email ? `?email=${encodeURIComponent(user.email)}` : ""}`} className="btn btn-ghost">
                  이메일 로그인 추가(비밀번호 설정)
                </Link>
              )}
              {linked.length > 1 &&
                linked
                  .filter((p) => p !== "email")
                  .map((p) => (
                    <form key={`un-${p}`} action={unlinkProvider}>
                      <input type="hidden" name="provider" value={p} />
                      <button type="submit" className="btn btn-ghost">
                        {PROVIDER_LABEL[p] ?? p} 해제
                      </button>
                    </form>
                  ))}
            </div>
            <span className="mp-note">로그인 방법은 항상 한 가지 이상 남아 있어야 해요.</span>
          </dd>
        </div>
        <div className="mp-row">
          <dt>내 이메일</dt>
          <dd>
            <span style={{ wordBreak: "break-all" }}>{user.email ?? "-"}</span>
            <span className="mp-note">이 주소는 나에게만 보여요.</span>
          </dd>
        </div>
      </dl>
      <div className="mp-foot">
        <form action={signOut}>
          <button type="submit" className="btn btn-ghost">
            로그아웃
          </button>
        </form>
        <small>
          더 이상 쓰지 않으신다면 <Link href="/mypage/withdraw">회원 탈퇴</Link>를 할 수 있어요.
        </small>
      </div>
    </>
  );

  const plansList = plansLoadFailed ? (
    <p role="alert" className="mp-msg err">
      기획안 목록을 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.
    </p>
  ) : plans.length === 0 ? (
    <p className="mp-note">아직 저장한 기획안이 없어요. 기획안 화면에서 「임시저장」을 누르면 여기에 나타나요.</p>
  ) : (
    <ul>
      {plans.map((p) => (
        <li key={p.id}>
          <span>{p.title}</span>
          <span>
            {p.is_public ? "공개 중" : "비공개"} · {formatKst(p.updated_at)} · <Link href={`/planner?plan=${p.id}`}>열기</Link>
          </span>
        </li>
      ))}
    </ul>
  );

  return <MypagePreview profile="none" pending={false} basic={basic} plans={plansList} collab={{ newCount: newCollab, content: collabList }} />;
}
