import { LIBRARY_QUESTION_SECTIONS } from "@/lib/library-questions";
import "./ai.css";

// 라이브러리 「질문 모음」: 큰 제목(접힘) → 세부 질문(접힘) → 답변. 데이터는 lib/library-questions.ts 한 곳이다.
// 브라우저 기본 접기·펴기(<details>)를 써서 Tab·Enter·Space 키로 열고 닫을 수 있다. 이 목록은 AI에게 넘기지 않는다.
// 답변이 null이면 펼쳐도 「답변을 준비하고 있어요」로 보인다.
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

export function LibraryQuestions() {
  return (
    <section className="ai-qs-wrap" aria-labelledby="ai-qs-h2">
      <div className="ai-kicker">질문 모음</div>
      <h2 id="ai-qs-h2" className="ai-sec-h2">궁금한 것부터 찾아보세요</h2>
      <p className="ai-lead">큰 제목을 누르면 세부 질문이 열리고, 질문을 누르면 답변을 볼 수 있어요.</p>
      <div className="ai-qs">
        {LIBRARY_QUESTION_SECTIONS.map((s) => (
          <details key={s.no} className="ai-qs-sec">
            <summary>
              <span>
                {s.title}
                <small>질문 {s.questions.length}개</small>
              </span>
              {PLUS}
              {MINUS}
            </summary>
            <div className="ai-qs-list">
              {s.questions.map((q, i) => (
                <details key={i} className="ai-qs-q">
                  <summary>
                    <span>{q.question}</span>
                    {PLUS}
                    {MINUS}
                  </summary>
                  {q.answer ? <p className="ans">{q.answer}</p> : <p className="ans pending">답변을 준비하고 있어요</p>}
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
