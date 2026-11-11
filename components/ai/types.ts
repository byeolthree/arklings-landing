// 미션7-2 AI 화면이 다루는 값의 모양. 화면 쪽 약속이며, 서버 단계에서 같은 모양으로 맞춘다(docs/screen-contract.md 「미션7-2 AI 기능」).

// ── AI 평가 ──
export type EvalSlot = { label: string; status: "ok" | "needs"; reason: string; fix: string };
export type EvalErrorKind = "login" | "input" | "limit" | "auth" | "busy" | "retry" | "schema";
export type EvalView =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; slots: EvalSlot[] }
  | { kind: "error"; reason: EvalErrorKind };

// ── 라이브러리 질의응답 ──
export type WikiItem = { id: string; question: string; answer: string; source: string; era: string };
export type AskErrorKind = "login" | "input" | "limit" | "auth" | "busy" | "retry";
export type AskMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  // 도우미 답의 상태: 작성 중 / 완료 / 자료에 없음 / 끊김(완성된 답처럼 보이지 않게 따로 표시)
  state?: "streaming" | "done" | "noMatch" | "interrupted";
  sources?: string[]; // 서버가 고른 위키 항목의 출처 이름(모델이 쓴 글에서 가져오지 않는다)
};
export type AskStatus = "ready" | "submitted" | "streaming" | "error";
export type AskController = {
  status: AskStatus;
  messages: AskMessage[];
  error: AskErrorKind | null;
  draft: string; // 입력칸에 남아 있는 질문(끊기거나 실패해도 지우지 않는다)
  setDraft: (v: string) => void;
  onAsk: () => void;
  onStop: () => void;
  onReset: () => void;
};
export const MAX_QUESTION_CHARS = 300; // 제안값
