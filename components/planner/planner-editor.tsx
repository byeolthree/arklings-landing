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
  updateRevision,
} from "@/app/actions/plans";
import { startWorkFromPlan } from "@/app/actions/creators";
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
  workId?: string | null; // 이 기획안이 붙은 작품(없으면 null)
  workPublic?: boolean; // 그 작품이 포트폴리오에 올라가 있는지
  initialStep?: 1 | 2; // 열 때의 단계(02 모아 보기는 내 기획안이 있을 때만)
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


export function PlannerEditor({ loggedIn, displayName, panel: initialPanel, workId = null, workPublic = false, initialStep = 1 }: Props) {
  const router = useRouter();
  const [panel, setPanel] = useState<PlanPanel | null>(initialPanel);
  // 화면을 연 뒤에 다른 창에서 로그인했을 수 있다. 열 때의 값(loggedIn)만 믿지 않고, 서버가 로그인했다고 답하면 이 값을 맞춘다.
  const [authedNow, setAuthedNow] = useState(false);
  const authed = authedNow || loggedIn;
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
  const [step, setStep] = useState<1 | 2>(initialStep === 2 && initialPanel ? 2 : 1);
  const [savedLocal, setSavedLocal] = useState<PlanDraft | null>(null); // 로그인하지 않고 저장한 내용(이 브라우저에만 있다)
  const [prevEdited, setPrevEdited] = useState<string | null>(null); // 제안 문장으로 바꾸기 전의 내 글(이 화면을 닫기 전까지)

  // 02 모아 보기에 보여 줄 「저장해 둔 내용」: 로그인했으면 서버에 저장된 가장 최근 내용, 아니면 이 브라우저에 저장한 내용
  const view: PlanDraft | null = authed && panel ? panel.latest : savedLocal;

  const nextPath = planId ? `/planner?plan=${planId}` : "/planner";
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const signupHref = `/signup?next=${encodeURIComponent(nextPath)}`;

  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // 처음 열 때: 이 기기에 남은 작성 중 내용이 있으면 이어서 보여 준다(자동 보관은 이 기기 안에서만).
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

  // 단계를 옮긴다. 로그인했고 기획안이 있으면 주소도 맞춰 둔다(새로고침해도 같은 단계로 열린다).
  function goStep(n: 1 | 2, id: string | null = planId) {
    setStep(n);
    if (authed && id) window.history.replaceState(null, "", n === 2 ? `/planner?plan=${id}&step=2` : `/planner?plan=${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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

  // 서버가 로그인했다고 답했는데 화면은 아직 로그아웃으로 알고 있으면 맞춘다. 이름·프로필 상태는 서버에서 다시 읽는다.
  function syncLogin() {
    if (authed) return;
    setAuthedNow(true);
    setLoginPrompt(null);
    router.refresh();
  }

  async function onSave() {
    const r = await run("save", () => savePlan(planId, draft));
    if (!r) return;
    if (!r.ok) {
      if (r.needLogin) {
        // 로그인하지 않았다: 이 브라우저에만 저장하고 02로 넘어간다.
        writeLocal(localKey(planId), draft);
        setSavedLocal(draft);
        needLogin("저장");
        goStep(2);
        return;
      }
      return setMsg({ text: r.error, err: true });
    }
    setLoginPrompt(null);
    setLastSaved(draft);
    clearLocal(localKey(planId));
    if (!authed) {
      // 화면을 연 뒤에 로그인한 경우: 이름·프로필 상태를 새로 읽으려고 이 기획안의 02 주소로 다시 연다(저장된 내용이 그대로 열린다).
      setAuthedNow(true);
      clearLocal(LOCAL_BASE);
      router.replace(`/planner?plan=${r.planId}&step=2`);
      return;
    }
    if (r.panel) setPanel(r.panel);
    if (!planId) clearLocal(LOCAL_BASE);
    setEditingRev(null);
    setMsg({ text: planId ? "저장했어요. 이력에 한 건 더해졌어요." : "저장했어요. 내 기획안에 이력이 한 건 남았어요." });
    goStep(2, r.planId);
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
          ? "이 기록을 고치는 중이에요. 다 고친 뒤 「이 기록에 덮어쓰기」를 눌러 주세요."
          : "이 기록을 불러왔어요. 이어서 쓰고, 마음에 들면 저장을 눌러 새 기록으로 남겨요. (되돌리려면 Ctrl+Z)",
    });
    if (step !== 1) goStep(1);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onDeleteRevision(rev: RevisionItem) {
    if (!planId) return;
    if (!window.confirm(`${rev.createdAt}의 저장 기록을 지울까요? 되돌릴 수 없어요.`)) return;
    const r = await run(`del-${rev.id}`, () => deleteRevision(planId, rev.id));
    if (!r) return;
    if (!r.ok) return setMsg({ text: r.error, err: true });
    if (editingRev?.id === rev.id) setEditingRev(null);
    if (r.panel) setPanel(r.panel);
    setMsg({ text: "기록을 지웠어요." });
  }

  async function onDeletePlan() {
    if (!planId) return;
    if (!window.confirm("이 기획안과 저장 기록을 모두 지울까요? 되돌릴 수 없어요.")) return;
    const r = await run("delplan", () => deletePlan(planId));
    if (!r) return;
    if (!r.ok) return setMsg({ text: r.error, err: true });
    clearLocal(localKey(planId));
    router.replace("/mypage");
  }

  // 「포트폴리오 작성하기」: 바로 올리지 않는다. 이 기획안이 붙은 작품(비공개)을 만들고 마이페이지의 포트폴리오 등록으로 넘어가 마저 쓴 뒤 거기서 올린다.
  async function onWrite() {
    if (!planId || !view) return;
    const r = await run("write", () => startWorkFromPlan(planId, view));
    if (!r) return;
    if (!r.ok) {
      if (r.needLogin) return needLogin("포트폴리오 작성");
      if (r.needProfile) return router.push("/mypage?msg=need_profile#mp-creator");
      return setMsg({ text: r.error, err: true });
    }
    router.push(`/mypage?work=${r.workId}#mp-portfolio`);
  }

  // PDF·메일은 저장해 둔 내용(view)으로 만든다. 로그인 여부는 화면이 미리 정하지 않고 서버가 답한다.
  async function onPdf() {
    if (!view) return;
    const r = await run("pdf", () => downloadPlanPdf(view));
    if (!r) return;
    if (!r.ok) {
      if (r.needLogin) return needLogin("내려받기");
      return setMsg({ text: r.error, err: true });
    }
    syncLogin();
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
    if (!view) return;
    const r = await run("mail", () => mailPlanPdf(view));
    if (!r) return;
    if (!r.ok) {
      if (r.needLogin) return needLogin("메일 받기");
      return setMsg({ text: r.error, err: true });
    }
    syncLogin();
    setMsg({ text: `${r.to} 로 PDF를 보냈어요. 안 보이면 스팸함도 확인해 주세요.` });
  }

  // 제안 문장으로 바꾸기: 바꾸기 전 내 글은 (1) Ctrl+Z, (2) 「바꾸기 전 내 글 되살리기」, (3) 저장 이력으로 남는다.
  function adoptSuggestion() {
    if (draft.edited !== null) setPrevEdited(draft.edited);
    setEdited(suggestion);
  }
  function restoreMine() {
    if (prevEdited === null) return;
    setEdited(prevEdited);
    setPrevEdited(null);
  }

  const dirty = lastSaved === null ? Boolean(draft.slots.some((s) => s) || draft.edited !== null) : !sameDraft(lastSaved, draft);
  const showSuggestionCard = draft.edited !== null && draft.edited.trim() !== suggestion.trim();

  return (
    <div className="pl" ref={rootRef}>
      <section className="plan-top">
        <div className="wrap">
          <h1>기획안 만들기</h1>
          <p>로그라인부터 써 볼까요? 다섯 칸을 채우면 이야기를 한 문장으로 말할 수 있어요.</p>
          <div className="tabs" role="tablist" aria-label="기획안 단계">
            <button className="tab" role="tab" aria-selected={step === 1} type="button" onClick={() => goStep(1)}>
              <span className="n">01</span>로그라인
            </button>
            <button className="tab" role="tab" aria-selected={step === 2} type="button" disabled={!view} onClick={() => goStep(2)}>
              <span className="n">02</span>모아 보기
            </button>
            <button className="tab" role="tab" aria-selected="false" type="button" disabled title="준비 중이에요">
              <span className="n">03</span>편집
            </button>
          </div>
        </div>
      </section>

      <section className="stage">
        <div className="wrap">
          {authed && (
            <section className="panel" aria-labelledby="pl-hist-h">
              <h2 id="pl-hist-h">{plan ? "저장 이력" : "내 기획안"}</h2>
              {!plan ? (
                <p className="sub">「저장」을 누르면 내 기획안이 만들어지고, 누를 때마다 이력이 한 건씩 남아요. 이력은 여기에 쌓여서, 이미 쓴 내용을 다시 쓰지 않고 불러올 수 있어요.</p>
              ) : (
                <>
                  <p className="sub">
                    누를 때마다 한 건씩 쌓여요(최대 {MAX_REVISIONS}건). 불러와서 이어 쓰거나, 그 자리에서 고치거나, 지울 수 있어요. 시각은 한국 시간(KST)이에요.
                  </p>
                  {revisions.length === 0 ? (
                    <p className="empty">남아 있는 이력이 없어요. 저장을 누르면 다시 쌓여요.</p>
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
                  <div className="row-actions">
                    <button type="button" className="btn btn-ghost sm danger" onClick={onDeletePlan} disabled={busy !== null}>
                      기획안 통째로 삭제
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          <div className="deck" role="tabpanel">
            <div className="crumb">
              <span>
                기획안 만들기 / <b>{step === 1 ? "로그라인" : "모아 보기"}</b>
              </span>
              {step === 1 && (
                <div className="undo-box">
                  <button type="button" className="btn btn-ghost sm" onClick={() => store.undo()} disabled={!store.canUndo} aria-label="되돌리기 (Ctrl+Z)">
                    되돌리기
                  </button>
                  <button type="button" className="btn btn-ghost sm" onClick={() => store.redo()} disabled={!store.canRedo} aria-label="다시 하기 (Ctrl+Shift+Z)">
                    다시
                  </button>
                </div>
              )}
            </div>

            {step === 1 && editingRev && (
              <div className="banner" role="status">
                <span className="grow">
                  <b>{editingRev.when}</b> 저장 기록을 고치는 중이에요. 덮어쓰면 원래 내용은 사라져요.
                </span>
                <button type="button" className="btn btn-primary sm" onClick={onOverwrite} disabled={busy !== null}>
                  {busy === "overwrite" ? "저장 중…" : "이 기록에 덮어쓰기"}
                </button>
                <button type="button" className="btn btn-ghost sm" onClick={() => setEditingRev(null)}>
                  고치기 끝내기
                </button>
              </div>
            )}

            {step === 1 && (
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
                    {/* 자리: 직접 고친 글을 먼저 평가하는 칸(LLM 호출)이 여기에 들어온다. 호출이 연결되기 전까지는 화면에 두지 않는다. */}
                    {showSuggestionCard && (
                      <div className="suggest-card" aria-label="아클링스 제안 문장">
                        <span className="k">아클링스 제안 문장</span>
                        <p>{suggestion}</p>
                        <p className="hint">지금 쓴 글은 이 카드를 보는 것만으로는 바뀌지 않아요. 바꾸면 Ctrl+Z나 「바꾸기 전 내 글 되살리기」로 돌아올 수 있어요.</p>
                        <div className="row-actions">
                          <button type="button" className="btn btn-ghost sm" onClick={adoptSuggestion}>
                            이 문장으로 바꾸기
                          </button>
                        </div>
                      </div>
                    )}
                    {prevEdited !== null && draft.edited !== prevEdited && (
                      <div className="row-actions">
                        <button type="button" className="btn btn-ghost sm" onClick={restoreMine}>
                          바꾸기 전 내 글 되살리기
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
            )}

            {step === 2 && view && (
              <div className="slide-body">
                <div className="qs">
                  <div className="qitem">
                    <span className="k">제목</span>
                    <h3>{view.title.trim() || "(제목을 적지 않았어요. 사건 칸의 앞부분이 제목이 돼요)"}</h3>
                  </div>
                  <div className="qitem">
                    <span className="k">로그라인</span>
                    <p>{loglineText(view)}</p>
                  </div>
                  <div className="qitem">
                    <span className="k">다섯 칸</span>
                    <ul>
                      {SLOT_LABELS.map((label, k) => (
                        <li key={label}>
                          <b>{label}</b> {view.slots[k].trim() || "(비어 있어요)"}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="qitem">
                    <span className="k">내려받기</span>
                    <p className="hint">저장해 둔 내용으로 PDF를 만들어요. 쓰는 중이던 고치지 않은 내용은 들어가지 않아요.</p>
                    <div className="row-actions">
                      <button type="button" className="btn btn-ghost sm" onClick={onPdf} disabled={busy !== null}>
                        {busy === "pdf" ? "만드는 중…" : "PDF 내려받기"}
                      </button>
                      <button type="button" className="btn btn-ghost sm" onClick={onMail} disabled={busy !== null}>
                        {busy === "mail" ? "보내는 중…" : "메일로 받기"}
                      </button>
                    </div>
                  </div>

                  <div className="qitem">
                    <span className="k">포트폴리오</span>
                    {authed && plan ? (
                      <div className="pub-box" style={{ borderTop: 0, paddingTop: 0, marginTop: 0 }}>
                        <p>
                          포트폴리오 작품{" "}
                          <span className={`pub-state ${workPublic ? "on" : ""}`}>{workId ? (workPublic ? "올라가 있음" : "작성 중 (아직 올리지 않음)") : "아직 없음"}</span>
                        </p>
                        <p style={{ marginTop: 6 }}>
                          「포트폴리오 작성하기」를 누르면 마이페이지의 포트폴리오 등록으로 넘어가요. 이 기획안의 제목과 로그라인이 채워진 작품이 만들어지고, 역할·장르·글·이미지를 더 적은 뒤 거기서 올릴 수 있어요.
                          올리기 전에는 아무에게도 보이지 않아요. 닉네임 <b>「{displayName || "이름 없음"}」</b>은 마이페이지에서 바꿀 수 있어요.
                        </p>
                        <div className="row-actions">
                          <button type="button" className="btn btn-primary sm" onClick={onWrite} disabled={busy !== null}>
                            {busy === "write" ? "여는 중…" : workId ? "포트폴리오 이어서 작성하기" : "포트폴리오 작성하기"}
                          </button>
                          {workPublic && workId && (
                            <a className="btn btn-ghost sm" href={`/portfolio/${workId}`} target="_blank" rel="noopener noreferrer">
                              포트폴리오에서 보기
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="hint">포트폴리오를 작성하려면 로그인해서 서버에 저장해야 해요. 로그인한 뒤 01에서 다시 「저장」을 눌러 주세요.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="deck-foot">
              <div>
                <p className={`save-msg ${msg?.err ? "err" : ""}`} role="status" aria-live="polite">
                  {msg?.text ?? ""}
                </p>
                <p className="save-note">
                  쓰는 내용은 이 기기에 자동으로 보관돼요.
                  {authed ? (step === 1 && dirty ? " 아직 서버에 저장하지 않은 내용이 있어요." : "") : " 로그인하지 않으면 이 브라우저에만 저장돼요."}
                </p>
              </div>
              <div className="foot-actions">
                {step === 1 ? (
                  <button type="button" className="btn btn-primary" onClick={onSave} disabled={busy !== null}>
                    {busy === "save" ? "저장 중…" : "저장"}
                  </button>
                ) : (
                  <button type="button" className="btn btn-ghost" onClick={() => goStep(1)}>
                    01 로그라인으로 돌아가 고치기
                  </button>
                )}
              </div>
            </div>
          </div>

          {loginPrompt && !authed && (
            <div className="notice login" role="alert">
              {loginPrompt === "저장" ? (
                <>
                  <b>로그인하지 않아 이 브라우저에만 임시로 저장돼요.</b>
                  <p style={{ marginTop: 4 }}>
                    로그인하면 서버에 저장하고 포트폴리오에도 올릴 수 있어요. 지금 쓴 내용은 이 기기에 남아 있으니, 로그인하고 돌아와서 이어서 저장하면 돼요.
                  </p>
                </>
              ) : (
                <>
                  <b>{loginPrompt}은(는) 로그인이 필요합니다.</b>
                  <p style={{ marginTop: 4 }}>
                    로그인한 뒤에 할 수 있어요. 지금 쓴 내용은 이 기기에 남아 있으니, 로그인하고 돌아와서 이어서 하면 돼요.
                  </p>
                </>
              )}
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
        </div>
      </section>
    </div>
  );
}
