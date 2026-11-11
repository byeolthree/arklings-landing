"use client";

import Link from "next/link";
import { MAX_QUESTION_CHARS, type AskController, type AskErrorKind, type WikiItem } from "./types";
import "./ai.css";

// 라이브러리 화면: 위쪽에 게시 Q&A(누구나), 아래쪽에 질문 칸(로그인한 사람만). 값만 받아 그리는 부품이다.
const ASK_ERRORS: Record<AskErrorKind, { text: string; refund?: boolean }> = {
  login: { text: "질문은 로그인한 뒤에 할 수 있어요." },
  input: { text: `질문은 비워 둘 수 없고 ${MAX_QUESTION_CHARS}자 이내로 써 주세요.` },
  limit: { text: "오늘 횟수를 다 썼어요. 내일 다시 가능해요." },
  auth: { text: "AI 연결에 문제가 있어요. 잠시 뒤 다시 시도해 주세요.", refund: true },
  busy: { text: "지금 요청이 몰려 있어요. 잠시 뒤 다시 시도해 주세요.", refund: true },
  retry: { text: "답을 가져오지 못했어요. 같은 질문으로 다시 시도할 수 있어요.", refund: true },
};

export function LibraryQa({ items, loggedIn, ctrl, loginHref = "/login?next=/library" }: { items: WikiItem[]; loggedIn: boolean; ctrl: AskController; loginHref?: string }) {
  const busy = ctrl.status === "submitted" || ctrl.status === "streaming";
  const len = ctrl.draft.trim().length;
  return (
    <div className="pl">
      <section className="plan-top">
        <div className="wrap">
          <h1>라이브러리</h1>
          <p>아클링스 자료 안에서만 답해요. 열국시대부터 삼한일통기까지의 이야기를 다뤄요.</p>
        </div>
      </section>

      <div className="wrap stage">
        <div className="panel">
          <h2>게시된 Q&A</h2>
          <p className="sub">누구나 읽을 수 있어요.</p>
          {items.length === 0 ? (
            <p className="ai-empty">아직 준비된 자료가 없어요.</p>
          ) : (
            <div className="ai-list">
              {items.map((it) => (
                <details key={it.id}>
                  <summary>{it.question}</summary>
                  <p className="ans">{it.answer}</p>
                  <div className="ai-meta">
                    <span className="ai-chip">{it.era}</span>
                    <span className="ai-chip">출처 {it.source}</span>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h2>질문하기</h2>
          <p className="sub">답은 위의 자료에서 찾아요. 자료에 없는 내용은 없다고 알려 줘요.</p>

          {!loggedIn ? (
            <div className="notice login">
              <p>질문은 로그인한 사람만 할 수 있어요. 사용 횟수를 사람별로 세기 때문이에요. 위의 Q&A는 로그인 없이 읽을 수 있어요.</p>
              <div className="row-actions">
                <Link href={loginHref} className="btn btn-primary sm">
                  로그인하러 가기
                </Link>
              </div>
            </div>
          ) : (
            <>
              {ctrl.messages.length > 0 && (
                <div className="ai-chat" aria-live="polite">
                  {ctrl.messages.map((m) => (
                    <Bubble key={m.id} m={m} />
                  ))}
                  {ctrl.status === "submitted" && (
                    <p className="ai-status" role="status">
                      <span className="ai-dots" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      자료에서 관련된 내용을 찾는 중이에요.
                    </p>
                  )}
                </div>
              )}

              <form
                className="ai-ask"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!busy) ctrl.onAsk();
                }}
              >
                <textarea
                  className="answer"
                  rows={3}
                  aria-label="질문"
                  placeholder="궁금한 점을 한 가지만 물어보세요."
                  value={ctrl.draft}
                  disabled={busy}
                  onChange={(e) => ctrl.setDraft(e.target.value)}
                />
                <div className="ai-ask-foot">
                  <span className={`len${len > MAX_QUESTION_CHARS ? " over" : ""}`}>
                    <span className="cnt">{len}</span> / {MAX_QUESTION_CHARS}자
                  </span>
                  <span className="row-actions" style={{ marginTop: 0 }}>
                    {busy && (
                      <button type="button" className="btn btn-ghost sm" onClick={ctrl.onStop}>
                        생성 중지
                      </button>
                    )}
                    {ctrl.messages.length > 0 && !busy && (
                      <button type="button" className="btn btn-ghost sm" onClick={ctrl.onReset}>
                        새 대화
                      </button>
                    )}
                    <button type="submit" className="btn btn-primary sm" disabled={busy || len === 0}>
                      질문하기
                    </button>
                  </span>
                </div>
              </form>

              {ctrl.error && (
                <div className="notice" role="alert">
                  <p>{ASK_ERRORS[ctrl.error].text}</p>
                  {ASK_ERRORS[ctrl.error].refund && <p className="ai-note">오늘 횟수는 줄지 않았어요. 질문은 그대로 남겨 두었어요.</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: AskController["messages"][number] }) {
  if (m.role === "user") return <div className="ai-bubble user">{m.text}</div>;
  if (m.state === "noMatch") {
    return (
      <div className="ai-bubble bot">
        이 자료에는 없어요.
        <span className="src">관련된 항목을 찾지 못해서 AI를 부르지 않았어요. 다른 말로 물어보거나, 위의 Q&A를 살펴봐 주세요.</span>
      </div>
    );
  }
  if (m.state === "interrupted") {
    return (
      <div className="ai-bubble bot cut">
        {m.text}
        <span className="state">답변을 마치지 못했어요. 위의 글은 완성된 답이 아니에요. 질문은 아래 칸에 남겨 두었어요.</span>
      </div>
    );
  }
  return (
    <div className="ai-bubble bot">
      {m.text}
      {m.state === "streaming" && <span className="state">작성 중이에요…</span>}
      {m.state === "done" && m.sources && m.sources.length > 0 && (
        <span className="src">
          <b>근거 자료</b> {m.sources.join(", ")}
        </span>
      )}
    </div>
  );
}
