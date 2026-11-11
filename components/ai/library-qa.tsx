"use client";

import Link from "next/link";
import { ErrorCard, type ErrorAction } from "./error-card";
import { MAX_QUESTION_CHARS, type AskController, type AskErrorKind, type AskMessage, type WikiItem } from "./types";
import { USAGE_TEXT as U } from "./usage-text";
import "./ai.css";

// 라이브러리 화면(시안 「라이브러리 ① 목록과 질문칸 · ② 답이 나오는 과정 · ③ 로그인 전·비었음·오류」). 값만 받아 그리는 부품이다.
const ERRORS: Record<AskErrorKind, { pill: string; title: string; desc: string; retry?: boolean }> = {
  limit: { pill: U.askLimitPill, title: U.askLimitTitle, desc: U.askLimitDesc },
  busy: { pill: "요청이 몰림", title: "지금 요청이 몰려 있어요", desc: `잠시 뒤에 다시 물어봐 주세요. ${U.notReduced}`, retry: true },
  auth: { pill: "AI 연결 문제", title: "AI와 연결하지 못했어요", desc: `지금은 질문에 답할 수 없어요. 잠시 뒤에 다시 물어보시고, 계속되면 아클링스에 알려 주세요. ${U.notReduced}` },
  retry: { pill: "일시 오류 · 시간 초과", title: "답을 가져오지 못했어요", desc: `질문은 입력칸에 그대로 남아 있어요. 다시 물어봐 주세요. ${U.notReduced}`, retry: true },
  input: { pill: "질문 입력 오류", title: "질문을 확인해 주세요", desc: `질문이 비어 있거나 ${MAX_QUESTION_CHARS}자를 넘었어요. 고친 뒤에 다시 눌러 주세요.` },
};

const PLUS = (
  <svg className="plus" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a61e5c" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const MINUS = (
  <svg className="minus" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a61e5c" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M5 12h14" />
  </svg>
);

export function LibraryQa({ items, listError = false, loggedIn, ctrl, loginHref = "/login?next=/library" }: { items: WikiItem[]; listError?: boolean; loggedIn: boolean; ctrl: AskController; loginHref?: string }) {
  const busy = ctrl.status === "submitted" || ctrl.status === "streaming";
  const last = ctrl.messages[ctrl.messages.length - 1];
  const cut = last?.role === "assistant" && last.state === "interrupted";
  const len = ctrl.draft.trim().length;
  const chatting = ctrl.messages.length > 0;
  const label = !chatting ? "질문" : busy ? "질문" : cut ? "질문" : last?.state === "noMatch" ? "다른 질문하기" : "이어서 질문하기";
  const placeholder = !chatting ? "예) 화랑은 어떤 사람들이었나요?" : busy ? "답이 끝나면 이어서 물어볼 수 있어요" : last?.state === "noMatch" ? "궁금한 점을 물어보세요" : "궁금한 점을 이어서 물어보세요";
  const errAction = (k: AskErrorKind): ErrorAction | undefined => (ERRORS[k].retry ? { label: "다시 묻기", kind: "line", onClick: ctrl.onAsk } : undefined);

  return (
    <div className="ai">
      <div className="ai-hero">
        <h1>라이브러리</h1>
        <p>열국시대부터 삼한일통기까지, 아클링스가 정리한 질문과 답이에요.</p>
      </div>

      <main className="ai-main">
        <div className="ai-sheet">
          <section>
            <div className="ai-kicker">게시된 질문과 답</div>
            <h2 className="ai-sec-h2">자주 묻는 질문</h2>
            {listError ? (
              // 시안에 없는 상태: 위키를 읽지 못한 것은 「자료가 없음」과 다르다(없다고 거짓 안내하지 않는다)
              <div className="ai-empty">
                <b>자료를 불러오지 못했어요</b>
                <p>잠시 뒤에 다시 시도해 주세요.</p>
              </div>
            ) : items.length === 0 ? (
              <div className="ai-empty">
                <b>아직 준비된 자료가 없어요</b>
                <p>자료를 준비하고 있어요. 준비되면 이곳에 질문과 답이 올라와요.</p>
              </div>
            ) : (
              <div className="ai-qa">
                {items.map((it, i) => (
                  <details key={it.id} open={i === 0}>
                    <summary>
                      <span>{it.question}</span>
                      {PLUS}
                      {MINUS}
                    </summary>
                    <p className="ans">{it.answer}</p>
                    <div className="ai-meta">
                      <span className="ai-tag">시대 · {it.era}</span>
                      <span className="ai-tag">출처 · 「{it.source}」</span>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>

          <section className="ai-ask">
            <div className="ai-kicker">AI에게 묻기</div>
            <h2 className="ai-sec-h2">궁금한 점을 물어보세요</h2>
            <p className="ai-lead">아클링스가 정리한 자료 안에서만 답해요. 답 아래에 근거로 쓴 자료 이름이 함께 나와요.</p>

            {!loggedIn ? (
              <div className="ai-locked">
                <label htmlFor="ai-q-locked" className="ai-label">
                  질문
                </label>
                <textarea id="ai-q-locked" className="ai-ta s" rows={2} disabled placeholder="로그인하면 질문할 수 있어요" />
                <p>{U.askLockedDesc}</p>
                <Link href={loginHref} className="ai-btn sm">
                  로그인하고 물어보기
                </Link>
              </div>
            ) : (
              <>
                {chatting && (
                  <div className="ai-chat" aria-live="polite">
                    {ctrl.messages.map((m) => (
                      <Bubble key={m.id} m={m} />
                    ))}
                    {ctrl.status === "submitted" && (
                      <div className="ai-bubble bot">
                        <div className="wait" style={{ marginTop: 0 }}>
                          <span className="ai-dots" aria-hidden="true">
                            <i />
                            <i />
                            <i />
                          </span>
                          자료를 바탕으로 답을 쓰는 중이에요
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!busy && len > 0) ctrl.onAsk();
                  }}
                >
                  <label htmlFor="ai-q" className={`ai-label${chatting ? " s" : ""}`} style={chatting ? { marginTop: 20 } : undefined}>
                    {label}
                  </label>
                  <textarea
                    id="ai-q"
                    className={`ai-ta${chatting ? " s" : ""}`}
                    rows={chatting ? 2 : 4}
                    placeholder={placeholder}
                    value={ctrl.draft}
                    disabled={busy}
                    onChange={(e) => ctrl.setDraft(e.target.value)}
                  />
                  <div className="ai-ask-foot">
                    <span className={`cnt${len > MAX_QUESTION_CHARS ? " over" : ""}`}>
                      {len} / {MAX_QUESTION_CHARS}자
                    </span>
                    <div className="right">
                      <span>{cut ? U.notReducedShort : ctrl.remaining !== null ? U.askLeft(ctrl.remaining) : ""}</span>
                      <button type="submit" className="ai-btn" disabled={busy || len === 0}>
                        {busy ? "답하는 중…" : cut ? "다시 묻기" : "물어보기"}
                      </button>
                    </div>
                  </div>
                  {!chatting && !ctrl.error && <p className="ai-note">질문을 입력하면 단추가 켜져요. 로그인한 분만 물어볼 수 있어요.</p>}
                </form>

                {ctrl.error && <ErrorCard pill={ERRORS[ctrl.error].pill} title={ERRORS[ctrl.error].title} desc={ERRORS[ctrl.error].desc} action={errAction(ctrl.error)} />}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Bubble({ m }: { m: AskMessage }) {
  if (m.role === "user") return <div className="ai-bubble user">{m.text}</div>;
  if (m.state === "noMatch") {
    return (
      <div className="ai-bubble bot none">
        이 자료에는 없는 내용이에요.
        <div className="sub">아클링스 라이브러리는 열국시대부터 삼한일통기까지를 다뤄요. 그 시기의 다른 질문을 해 보세요.</div>
      </div>
    );
  }
  if (m.state === "interrupted") {
    return (
      <div className="ai-bubble bot cut">
        {m.text}…
        <div className="cutmsg">답변을 마치지 못했어요</div>
      </div>
    );
  }
  return (
    <div className="ai-bubble bot">
      {m.text}
      {m.state === "streaming" && (
        <>
          <span className="ai-caret" aria-hidden="true" />
          <div className="wait">
            <span className="ai-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            자료를 바탕으로 답을 쓰는 중이에요
          </div>
        </>
      )}
      {m.state === "done" && m.sources && m.sources.length > 0 && (
        <div className="ai-src">
          <b>근거 자료</b>
          <div className="ai-meta">
            {m.sources.map((s) => (
              <span key={s} className="ai-tag">
                「{s}」
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
