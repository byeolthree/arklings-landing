"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deletePlan,
  deleteRevision,
  downloadPlanPdf,
  getRevision,
  mailPlanPdf,
  savePlan,
  setPlanPublic,
  updateRevision,
} from "@/app/actions/plans";
import {
  buildSuggestion,
  emptyDraft,
  loglineText,
  MAX_REVISIONS,
  parseDraft,
  SLOT_LABELS,
  type CheckValue,
  type PlanDraft,
  type PlanPanel,
  type RevisionItem,
} from "@/lib/plans";
import { FINAL_CHECK_OFFSET, FINAL_CHECKS, LOGLINE_MAX, LOGLINE_MIN, SHORT_CHECK_OFFSET, SHORT_CHECKS, SLOT_QUESTIONS } from "./questions";
import { useUndo } from "./use-undo";
import "./planner.css";

type Props = {
  loggedIn: boolean;
  displayName: string;
  panel: PlanPanel | null;
};

type Msg = { text: string; err?: boolean } | null;

const LOCAL_BASE = "arklings-planner-draft";
// 왼쪽 양식 문장에서 다섯 칸 사이를 잇는 말(lib/plans.ts의 buildSuggestion과 같은 문장)
const CONNECTORS = ["이 벌어진 후, ", "은 ", "을 극복해야 ", "를 달성할 수 있다. 그렇지 않으면 ", "이 닥친다."];

function localKey(planId: string | null) {
  return planId ? `${LOCAL_BASE}:${planId}` : LOCAL_BASE;
}

// 예전 화면(public/planner.html)이 저장해 둔 모양과 새 모양을 모두 읽는다.
function readLocal(key: string): PlanDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw) as Record<string, unknown>;
    const edited = typeof d.edited === "string" ? d.edited : d.edited === true && typeof d.logline === "string" ? d.logline : null;
    const parsed = parseDraft({
      title: typeof d.title === "string" ? d.title : "",
      slots: d.slots,
      checks: d.checks,
      edited,
    });
    return parsed.ok ? parsed.draft : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, d: PlanDraft) {
  try {
    localStorage.setItem(key, JSON.stringify(d));
  } catch {
    // 브라우저가 저장을 막고 있어도 작성은 계속할 수 있다.
  }
}

function clearLocal(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // 무시
  }
}

const sameDraft = (a: PlanDraft, b: PlanDraft) => JSON.stringify(a) === JSON.stringify(b);

function CountLine({ n, min, max }: { n: number; min: number; max: number }) {
  const cls = n > max ? "over" : n >= min ? "ok" : "";
  return (
    <p className={`len ${cls}`}>
      <span className="cnt">{n}</span>자 · {min}~{max}자로 써 주세요
    </p>
  );
}

function YesNo({ idx, label, value, onPick }: { idx: number; label: string; value: CheckValue; onPick: (i: number, v: CheckValue) => void }) {
  return (
    <div className="check">
      <p>{label}</p>
      <div className="opts yn" role="group" aria-label={label}>
        {(["yes", "no"] as const).map((v) => (
          <button key={v} type="button" className="opt" aria-pressed={value === v} onClick={() => onPick(idx, value === v ? "" : v)}>
            {v === "yes" ? "예" : "아니오"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PlannerEditor({ loggedIn, displayName, panel: initialPanel }: Props) {
  const router = useRouter();
  const [panel, setPanel] = useState<PlanPanel | null>(initialPanel);
  const plan = panel?.plan ?? null;
  const revisions = panel?.revisions ?? [];
  const planId = plan?.id ?? null;
  const store = useUndo<PlanDraft>(initialPanel?.latest ?? emptyDraft());
  const draft = store.value;
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loginPrompt, setLoginPrompt] = useState<string | null>(null);
  const [editingRev, setEditingRev] = useState<{ id: string; when: string } | null>(null);
  const [focusSlot, setFocusSlot] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [lastSaved, setLastSaved] = useState<PlanDraft | null>(initialPanel?.latest ?? null);

  const loginHref = `/login?next=${encodeURIComponent(planId ? `/planner?plan=${planId}` : "/planner")}`;
  const signupHref = `/signup?next=${encodeURIComponent(planId ? `/planner?plan=${planId}` : "/planner")}`;

  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // 처음 열 때: 이 기기에 남은 작성 중 내용이 있으면 이어서 보여 준다(자동 저장은 이 기기 안에서만).
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const local = readLocal(localKey(planId));
    if (local && !sameDraft(local, draftRef.current)) {
      store.set(local);
      setMsg({ text: planId ? "저장하지 않은 내용을 이 기기에서 불러왔어요." : "저번에 쓰던 내용을 이 기기에서 불러왔어요." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 이 기기에 자동 보관(0.4초 쉬었다가). 창을 닫거나 새로고침할 때는 기다리지 않고 바로 보관한다.
  useEffect(() => {
    if (!restored.current) return;
    const t = setTimeout(() => writeLocal(localKey(planId), draft), 400);
    const flush = () => writeLocal(localKey(planId), draft);
    window.addEventListener("pagehide", flush);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pagehide", flush);
    };
  }, [draft, planId]);

  // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y (Mac은 ⌘)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k !== "z" && k !== "y") return;
      const t = e.target as Node | null;
      if (t && t !== document.body && !rootRef.current?.contains(t)) return;
      e.preventDefault();
      if (k === "y" || e.shiftKey) store.redo();
      else store.undo();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [store]);

  const setSlot = (k: number, v: string) =>
    store.update((d) => ({ ...d, slots: d.slots.map((s, i) => (i === k ? v : s)) }), `slot-${k}`);
  const setCheck = (i: number, v: CheckValue) =>
    store.update((d) => ({ ...d, checks: d.checks.map((c, j) => (j === i ? v : c)) }), `check-${i}`);
  const setTitle = (v: string) => store.update((d) => ({ ...d, title: v }), "title");
  const setEdited = (v: string | null) => store.update((d) => ({ ...d, edited: v }), "edited");

  const suggestion = buildSuggestion(draft.slots).text;
  const shown = loglineText(draft);
  const noCount = draft.checks.slice(FINAL_CHECK_OFFSET, FINAL_CHECK_OFFSET + 3).filter((c) => c === "no").length;

  const needLogin = useCallback((what: string) => {
    setLoginPrompt(what);
    setMsg(null);
  }, []);

  async function run<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
    if (busy) return null;
    setBusy(name);
    setMsg(null);
    try {
      return await fn();
    } catch {
      setMsg({ text: "연결에 문제가 있어요. 잠시 뒤에 다시 시도해 주세요.", err: true });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function onSave() {
    if (!loggedIn) return needLogin("저장");
    const r = await run("save", () => savePlan(planId, draft));
    if (!r) return;
    if (!r.ok) {
      if (r.needLogin) return needLogin("저장");
      return setMsg({ text: r.error, err: true });
    }
    setLoginPrompt(null);
    setLastSaved(draft);
    clearLocal(localKey(planId));
    if (r.panel) setPanel(r.panel);
    if (!planId) {
      clearLocal(LOCAL_BASE);
      // 화면을 다시 불러오지 않고 주소만 바꿔 둔다(쓰던 내용과 되돌리기 기록이 그대로 남는다).
      window.history.replaceState(null, "", `/planner?plan=${r.planId}`);
      setMsg({ text: "임시저장했어요. 내 기획안에 이력이 한 건 남았어요." });
    } else {
      setMsg({ text: "임시저장했어요. 아래 이력에 한 건 더해졌어요." });
    }
  }

  async function onOverwrite() {
    if (!editingRev || !planId) return;
    const r = await run("overwrite", () => updateRevision(planId, editingRev.id, draft));
    if (!r) return;
    if (!r.ok) return setMsg({ text: r.error, err: true });
    setLastSaved(draft);
    clearLocal(localKey(planId));
    setEditingRev(null);
    if (r.panel) setPanel(r.panel);
    setMsg({ text: "이 기록을 고친 내용으로 바꿨어요." });
  }

  async function loadRevision(rev: RevisionItem, mode: "continue" | "edit") {
    if (!planId) return;
    const r = await run(`load-${rev.id}`, () => getRevision(planId, rev.id));
    if (!r) return;
    if (!r.ok) return setMsg({ text: r.error, err: true });
    store.set(r.draft);
    setEditingRev(mode === "edit" ? { id: rev.id, when: rev.createdAt } : null);
    setMsg({
      text:
        mode === "edit"
          ? "이 기록을 고치는 중이에요. 다 고친 뒤 위쪽의 「이 기록에 덮어쓰기」를 눌러 주세요."
          : "이 기록을 불러왔어요. 이어서 쓰고, 마음에 들면 임시저장을 눌러 새 기록으로 남겨요. (되돌리려면 Ctrl+Z)",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onDeleteRevision(rev: RevisionItem) {
    if (!planId) return;
    if (!window.confirm(`${rev.createdAt}의 임시저장 기록을 지울까요? 되돌릴 수 없어요.`)) return;
    const r = await run(`del-${rev.id}`, () => deleteRevision(planId, rev.id));
    if (!r) return;
    if (!r.ok) return setMsg({ text: r.error, err: true });
    if (editingRev?.id === rev.id) setEditingRev(null);
    if (r.panel) setPanel(r.panel);
    setMsg({ text: "기록을 지웠어요." });
  }

  async function onDeletePlan() {
    if (!planId) return;
    if (!window.confirm("이 기획안과 임시저장 기록을 모두 지울까요? 되돌릴 수 없어요.")) return;
    const r = await run("delplan", () => deletePlan(planId));
    if (!r) return;
    if (!r.ok) return setMsg({ text: r.error, err: true });
    clearLocal(localKey(planId));
    router.replace("/mypage");
  }

  async function onPublic(makePublic: boolean) {
    if (!planId) return;
    const r = await run("public", () => setPlanPublic(planId, makePublic, draft));
    if (!r) return;
    if (!r.ok) return setMsg({ text: r.error, err: true });
    if (r.panel) setPanel(r.panel);
    setMsg({ text: makePublic ? "포트폴리오에 올렸어요. 지금 화면의 완성 내용이 공개용으로 저장됐어요." : "포트폴리오에서 내렸어요. 공개용 사본도 지웠어요." });
  }

  async function onPdf() {
    if (!loggedIn) return needLogin("내려받기");
    const r = await run("pdf", () => downloadPlanPdf(draft));
    if (!r) return;
    if (!r.ok) {
      if (r.needLogin) return needLogin("내려받기");
      return setMsg({ text: r.error, err: true });
    }
    const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = r.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setMsg({ text: "PDF를 내려받았어요." });
  }

  async function onMail() {
    if (!loggedIn) return needLogin("메일 받기");
    const r = await run("mail", () => mailPlanPdf(draft));
    if (!r) return;
    if (!r.ok) {
      if (r.needLogin) return needLogin("메일 받기");
      return setMsg({ text: r.error, err: true });
    }
    setMsg({ text: `${r.to} 로 PDF를 보냈어요. 안 보이면 스팸함도 확인해 주세요.` });
  }

  const dirty = lastSaved === null ? Boolean(draft.slots.some((s) => s) || draft.edited !== null) : !sameDraft(lastSaved, draft);

  return (
    <div className="pl" ref={rootRef}>
      <section className="plan-top">
        <div className="wrap">
          <h1>기획안 만들기</h1>
          <p>로그라인부터 써 볼까요? 다섯 칸을 채우면 이야기를 한 문장으로 말할 수 있어요.</p>
          <div className="tabs" role="tablist" aria-label="기획안 단계">
            <button className="tab" role="tab" aria-selected="true" type="button" tabIndex={-1}>
              <span className="n">01</span>로그라인
            </button>
          </div>
        </div>
      </section>

      <section className="stage">
        <div className="wrap">
          <div className="deck" role="tabpanel">
            <div className="crumb">
              <span>
                기획안 만들기 / <b>로그라인</b>
              </span>
              <div className="undo-box">
                <button type="button" className="btn btn-ghost sm" onClick={() => store.undo()} disabled={!store.canUndo} aria-label="되돌리기 (Ctrl+Z)">
                  되돌리기
                </button>
                <button type="button" className="btn btn-ghost sm" onClick={() => store.redo()} disabled={!store.canRedo} aria-label="다시 하기 (Ctrl+Shift+Z)">
                  다시
                </button>
              </div>
            </div>

            {editingRev && (
              <div className="banner" role="status">
                <span className="grow">
                  <b>{editingRev.when}</b> 임시저장 기록을 고치는 중이에요. 덮어쓰면 원래 내용은 사라져요.
                </span>
                <button type="button" className="btn btn-primary sm" onClick={onOverwrite} disabled={busy !== null}>
                  {busy === "overwrite" ? "저장 중…" : "이 기록에 덮어쓰기"}
                </button>
                <button type="button" className="btn btn-ghost sm" onClick={() => setEditingRev(null)}>
                  고치기 끝내기
                </button>
              </div>
            )}

            <div className="slide-body">
              <div className="side">
                <p className="tmpl">
                  {SLOT_LABELS.map((label, k) => {
                    const v = draft.slots[k].trim();
                    const cls = `${focusSlot === k ? "cur" : ""} ${v ? "filled" : ""}`.trim();
                    const body = v || `(${label})`;
                    return (
                      <span key={label}>
                        <b className={cls}>{body}</b>
                        {CONNECTORS[k]}
                      </span>
                    );
                  })}
                </p>
              </div>

              <div className="qs">
                <div className="qitem">
                  <span className="k">기획안 제목 (선택)</span>
                  <label htmlFor="pl-title" className="hint" style={{ display: "block" }}>
                    비워 두면 사건 칸의 앞부분이 제목이 돼요.
                  </label>
                  <input
                    id="pl-title"
                    className="answer title-in"
                    type="text"
                    maxLength={60}
                    value={draft.title}
                    onChange={(e) => setTitle(e.target.value)}
                    aria-label="기획안 제목"
                  />
                </div>

                {SLOT_QUESTIONS.map((q, k) => (
                  <div key={q.k} style={{ display: "contents" }}>
                    <div className="qitem">
                      <span className="k">{q.k}</span>
                      <h3>{q.title}</h3>
                      <p className="hint">{q.hint}</p>
                      <textarea
                        className="answer"
                        rows={2}
                        aria-label={SLOT_LABELS[k]}
                        maxLength={200}
                        value={draft.slots[k]}
                        onChange={(e) => setSlot(k, e.target.value)}
                        onFocus={() => setFocusSlot(k)}
                        onBlur={() => setFocusSlot((cur) => (cur === k ? null : cur))}
                      />
                      <CountLine n={draft.slots[k].trim().length} min={q.min} max={q.max} />
                      <div className="bad">
                        <p>이렇게 쓰면 다시 생각해 보세요</p>
                        <ul>
                          {q.bad.map(([a, b]) => (
                            <li key={a}>
                              {a} <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="qitem">
                      <span className="k">확인</span>
                      {q.checks.map((c, j) => (
                        <YesNo key={c} idx={k * 3 + j} label={c} value={draft.checks[k * 3 + j]} onPick={setCheck} />
                      ))}
                    </div>
                  </div>
                ))}

                <div className="qitem">
                  <span className="k">06 로그라인 완성</span>
                  <h3>다섯 칸이 한 문장으로 모였어요. 직접 다듬어 보세요.</h3>
                  <textarea
                    className="answer"
                    rows={5}
                    aria-label="로그라인"
                    maxLength={1000}
                    value={shown}
                    onChange={(e) => setEdited(e.target.value)}
                  />
                  <CountLine n={shown.trim().length} min={LOGLINE_MIN} max={LOGLINE_MAX} />
                  <p className="hint" style={{ marginTop: 6 }}>
                    {draft.edited !== null
                      ? "직접 고친 글이에요. 위의 다섯 칸을 바꿔도 이 글은 그대로 두고, 아클링스가 제안한 문장은 따로 보관돼요."
                      : "아직 아클링스가 제안한 문장이에요. 고치면 고친 글이 따로 저장되고 제안 문장은 그대로 남아요."}
                  </p>
                  {draft.edited !== null && (
                    <div className="row-actions">
                      <button type="button" className="btn btn-ghost sm" onClick={() => setEdited(null)}>
                        아클링스 제안 문장으로 되돌리기
                      </button>
                      <button type="button" className="btn btn-ghost sm" onClick={() => setEdited(suggestion)}>
                        제안 문장을 가져와서 고치기
                      </button>
                    </div>
                  )}
                </div>

                <div className="qitem">
                  <span className="k">마지막 확인</span>
                  {FINAL_CHECKS.map((c, j) => (
                    <YesNo key={c} idx={FINAL_CHECK_OFFSET + j} label={c} value={draft.checks[FINAL_CHECK_OFFSET + j]} onPick={setCheck} />
                  ))}
                  {noCount >= 2 && (
                    <p className="warn">다 채운 것 같아도, 아직 빠진 부품이 있을 가능성이 커요. ‘아니오’라고 답한 칸을 다시 봐 주세요.</p>
                  )}
                </div>

                <div className="qitem">
                  <span className="k">줄여서 확인</span>
                  {SHORT_CHECKS.map((c, j) => (
                    <YesNo key={c} idx={SHORT_CHECK_OFFSET + j} label={c} value={draft.checks[SHORT_CHECK_OFFSET + j]} onPick={setCheck} />
                  ))}
                </div>
              </div>
            </div>

            <div className="deck-foot">
              <div>
                <p className={`save-msg ${msg?.err ? "err" : ""}`} role="status" aria-live="polite">
                  {msg?.text ?? ""}
                </p>
                <p className="save-note">
                  쓰는 내용은 이 기기에 자동으로 보관돼요.
                  {loggedIn ? (dirty ? " 아직 서버에 저장하지 않은 내용이 있어요." : "") : " 서버에 저장하려면 로그인이 필요해요."}
                </p>
              </div>
              <div className="foot-actions">
                <button type="button" className="btn btn-primary" onClick={onSave} disabled={busy !== null}>
                  {busy === "save" ? "저장 중…" : "임시저장"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={onPdf} disabled={busy !== null}>
                  {busy === "pdf" ? "만드는 중…" : "PDF 내려받기"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={onMail} disabled={busy !== null}>
                  {busy === "mail" ? "보내는 중…" : "메일로 받기"}
                </button>
              </div>
            </div>
          </div>

          {loginPrompt && !loggedIn && (
            <div className="notice login" role="alert">
              <b>저장하려면 로그인이 필요합니다.</b>
              <p style={{ marginTop: 4 }}>
                {loginPrompt}은(는) 로그인한 뒤에 할 수 있어요. 지금 쓴 내용은 이 기기에 남아 있으니, 로그인하고 돌아와서 이어서 저장하면 돼요.
              </p>
              <div className="row-actions">
                <Link className="btn btn-primary sm" href={loginHref}>
                  로그인
                </Link>
                <Link className="btn btn-ghost sm" href={signupHref}>
                  회원가입
                </Link>
              </div>
            </div>
          )}

          {loggedIn && (
            <section className="panel" aria-labelledby="pl-hist-h">
              <h2 id="pl-hist-h">{plan ? "임시저장 이력" : "내 기획안"}</h2>
              {!plan ? (
                <p className="sub">「임시저장」을 누르면 내 기획안이 만들어지고, 누를 때마다 이력이 한 건씩 남아요.</p>
              ) : (
                <>
                  <p className="sub">
                    누를 때마다 한 건씩 쌓여요(최대 {MAX_REVISIONS}건). 불러와서 이어 쓰거나, 그 자리에서 고치거나, 지울 수 있어요. 시각은 한국 시간(KST)이에요.
                  </p>
                  {revisions.length === 0 ? (
                    <p className="empty">남아 있는 이력이 없어요. 임시저장을 누르면 다시 쌓여요.</p>
                  ) : (
                    <ul className="hist">
                      {revisions.map((r) => (
                        <li key={r.id}>
                          <div>
                            <span className="when">{r.createdAt}</span>
                            {r.edited && <span className="badge">직접 고친 글</span>}
                            {editingRev?.id === r.id && <span className="badge">고치는 중</span>}
                          </div>
                          <p className="prev">{r.preview}</p>
                          <div className="row-actions" style={{ marginTop: 0 }}>
                            <button type="button" className="btn btn-ghost sm" onClick={() => loadRevision(r, "continue")} disabled={busy !== null}>
                              불러와서 이어 쓰기
                            </button>
                            <button type="button" className="btn btn-ghost sm" onClick={() => loadRevision(r, "edit")} disabled={busy !== null}>
                              이 기록 고치기
                            </button>
                            <button type="button" className="btn btn-ghost sm danger" onClick={() => onDeleteRevision(r)} disabled={busy !== null}>
                              삭제
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="pub-box">
                    <p>
                      포트폴리오 <span className={`pub-state ${plan.isPublic ? "on" : ""}`}>{plan.isPublic ? "올라가 있음" : "올리지 않음"}</span>
                      {plan.isPublic && plan.publishedAt && <span> · 공개 내용 저장 {plan.publishedAt}</span>}
                    </p>
                    <p style={{ marginTop: 6 }}>
                      올리면 공개 이름 <b>「{displayName || "이름 없음"}」</b>과 이 기획안의 완성 내용이 포트폴리오에서 누구에게나 보여요. 이메일과 임시저장 이력은 공개되지 않아요.
                      공개 이름은 마이페이지에서 바꿀 수 있고, 바꾸면 포트폴리오에도 바로 반영돼요. 올릴지 말지는 직접 고르세요. 언제든 내릴 수 있어요.
                    </p>
                    <div className="row-actions">
                      <button type="button" className="btn btn-primary sm" onClick={() => onPublic(true)} disabled={busy !== null}>
                        {plan.isPublic ? "지금 화면 내용으로 포트폴리오 내용 갱신" : "포트폴리오에 올리기"}
                      </button>
                      {plan.isPublic && (
                        <>
                          <a className="btn btn-ghost sm" href={`/portfolio/${plan.id}`} target="_blank" rel="noopener noreferrer">
                            포트폴리오에서 보기
                          </a>
                          <button type="button" className="btn btn-ghost sm" onClick={() => onPublic(false)} disabled={busy !== null}>
                            포트폴리오에서 내리기
                          </button>
                        </>
                      )}
                      <button type="button" className="btn btn-ghost sm danger" onClick={onDeletePlan} disabled={busy !== null}>
                        기획안 통째로 삭제
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

