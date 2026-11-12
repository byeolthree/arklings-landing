import { LIBRARY_QUESTION_SECTIONS } from "@/lib/library-questions";
import "./ai.css";

// 라이브러리 「질문 모음」: 큰 제목(접힘) → 세부 질문(접힘) → 답변. 데이터는 lib/library-questions.ts 한 곳이다.
// 브라우저 기본 접기·펴기(<details>)를 써서 Tab·Enter·Space 키로 열고 닫을 수 있다. 이 목록은 AI에게 넘기지 않는다.
// 답변이 null이면 펼쳐도 「답변을 준비하고 있어요」로 보인다.
const PLUS = (
  <svg
    className="plus"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#a61e5c"
    strokeWidth="2.2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const MINUS = (
  <svg
    className="minus"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#a61e5c"
    strokeWidth="2.2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
  </svg>
);

// 태그 예시: 질문마다 시대·나라가 정해지기 전까지 모든 질문에 같은 예시를 보여 준다. 나라 태그는 시대 태그 다음에 온다.
const EXAMPLE_ERA = "열국시대";
const EXAMPLE_COUNTRY = "고구려";

export function LibraryQuestions() {
  return (
    <div className="ai-qs">
      {LIBRARY_QUESTION_SECTIONS.map((s) => (
        <details key={s.no} className="ai-qs-sec">
          <summary>
            <span>{s.title}</span>
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
                {q.answer ? (
                  <p className="ans">{q.answer}</p>
                ) : (
                  <p className="ans pending">답변을 준비하고 있어요</p>
                )}
                <div className="ai-meta">
                  <span className="ai-tag">시대 · {EXAMPLE_ERA}</span>
                  <span className="ai-tag">나라 · {EXAMPLE_COUNTRY}</span>
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
