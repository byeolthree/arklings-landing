"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo, useRef, useState } from "react";
import { getAiRemaining } from "@/app/actions/ai";
import { LibraryQa } from "./library-qa";
import { MAX_QUESTION_CHARS, type AskController, type AskErrorKind, type AskMessage, type AskStatus, type WikiItem } from "./types";

// 라이브러리 화면을 실제 서버(/api/library/ask)에 잇는 부분. 화면 모양은 library-qa.tsx(시안)가 그대로 그린다.
// 서버가 보내는 메시지 부가 정보(metadata): sources(근거 자료 이름), noMatch(자료 없음).
type Meta = { sources?: string[]; noMatch?: boolean; finishReason?: string };
type Msg = UIMessage<Meta>;

const textOf = (m: Msg) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

// 서버로는 사용자·도우미 메시지의 글 조각만 보낸다(서버도 그 밖의 것은 거절한다).
function toWire(messages: Msg[]) {
  return messages
    .map((m) => ({ role: m.role, parts: m.parts.flatMap((p) => (p.type === "text" && p.text.trim() ? [{ type: "text" as const, text: p.text }] : [])) }))
    .filter((m) => m.parts.length > 0);
}

// 서버의 오류 알림을 화면의 오류 종류로 바꾼다. 요청 단계의 오류는 {"code":…} 글, 답을 쓰는 도중의 오류는 「answer_failed:종류」 글이다.
function kindOf(err: Error): AskErrorKind | "login" {
  const m = err.message ?? "";
  try {
    const j = JSON.parse(m) as { code?: unknown };
    if (j && typeof j.code === "string") {
      if (j.code === "login") return "login";
      if (j.code === "input" || j.code === "limit" || j.code === "busy" || j.code === "auth" || j.code === "retry") return j.code;
    }
  } catch {
    // 글이 JSON이 아니면 아래에서 본다
  }
  const mm = /^answer_failed:(auth|busy|retry|schema)$/.exec(m);
  if (mm) return mm[1] === "schema" ? "retry" : (mm[1] as AskErrorKind);
  return "retry";
}

export function LibraryChat({ items, listError, loggedIn, loginHref, initialRemaining }: { items: WikiItem[]; listError?: boolean; loggedIn: boolean; loginHref?: string; initialRemaining: number | null }) {
  const transport = useMemo(() => new DefaultChatTransport<Msg>({ api: "/api/library/ask", prepareSendMessagesRequest: ({ messages }) => ({ body: { messages: toWire(messages) } }) }), []);
  const [draft, setDraft] = useState("");
  const [remaining, setRemaining] = useState<number | null>(initialRemaining);
  const [localError, setLocalError] = useState<AskErrorKind | null>(null);
  const [signedOut, setSignedOut] = useState(false); // 쓰는 도중 로그인이 풀렸을 때
  const lastQuestion = useRef("");

  // 한 번 묻고 끝나면(답 완료·오류) 남은 횟수를 새로 읽는다.
  const refreshRemaining = () => void getAiRemaining("library_ask").then((n) => setRemaining(n));

  const { messages, sendMessage, status, error, clearError, setMessages } = useChat<Msg>({
    transport,
    onFinish: refreshRemaining,
    // 오류가 나면 질문을 입력칸에 돌려놓는다(대화에서 보이는 모양은 아래에서 오류 상태로부터 정한다).
    onError: (err) => {
      if (kindOf(err) === "login") setSignedOut(true);
      setDraft((d) => d || lastQuestion.current);
      refreshRemaining();
    },
  });

  const errKind = error ? kindOf(error) : null;
  // 이번 질문(마지막 사용자 메시지) 뒤에 도우미 답이 얼마나 나왔는지로 오류를 나눈다.
  //  · 답이 일부 나온 뒤 오류 → 끊긴 답(일부 답을 남기고 「다시 묻기」)
  //  · 첫 글자가 나오기 전 오류 → 이번 질문을 대화에서 가리고 오류 카드를 보인다(질문은 입력칸에 남아 있다)
  const lastUserIdx = messages.map((m) => m.role).lastIndexOf("user");
  const turnAssistant = lastUserIdx >= 0 ? messages.slice(lastUserIdx + 1).find((m) => m.role === "assistant") : undefined;
  const turnText = turnAssistant ? textOf(turnAssistant) : "";
  const cut = Boolean(error) && turnText.length > 0 && !turnAssistant?.metadata?.noMatch;
  const failedBeforeText = Boolean(error) && !cut;

  const shown = failedBeforeText && lastUserIdx >= 0 ? messages.slice(0, lastUserIdx) : messages;
  const view: AskMessage[] = shown.map((m, i) => {
    const text = textOf(m);
    if (m.role === "user") return { id: m.id, role: "user", text };
    const isLast = i === shown.length - 1;
    let state: AskMessage["state"] = "done";
    if (m.metadata?.noMatch) state = "noMatch";
    else if (isLast && status === "streaming") state = "streaming";
    else if (isLast && cut) state = "interrupted";
    return { id: m.id, role: "assistant", text, state, sources: m.metadata?.sources };
  });

  const onAsk = () => {
    const q = draft.trim();
    if (!q || q.length > MAX_QUESTION_CHARS) {
      setLocalError("input");
      return;
    }
    setLocalError(null);
    if (error) clearError();
    if (cut || failedBeforeText) setMessages((prev) => prev.slice(0, lastUserIdx)); // 실패한 질문(과 끊긴 답)을 치우고 고친 질문을 보낸다
    lastQuestion.current = q;
    setDraft("");
    void sendMessage({ text: q });
  };

  const shownError: AskErrorKind | null = localError ?? (failedBeforeText && errKind && errKind !== "login" ? errKind : null);
  const ctrl: AskController = {
    status: status as AskStatus,
    messages: view,
    error: shownError,
    draft,
    setDraft: (v) => {
      setDraft(v);
      if (localError) setLocalError(null);
    },
    onAsk,
    remaining,
  };
  return <LibraryQa items={items} listError={listError} loggedIn={loggedIn && !signedOut} ctrl={ctrl} loginHref={loginHref} />;
}
