"use client";

import { useEffect, useRef, useState } from "react";
import { LibraryQa } from "@/components/ai/library-qa";
import type { AskController, AskErrorKind, AskMessage, AskStatus } from "@/components/ai/types";
import { MAX_QUESTION_CHARS } from "@/components/ai/types";
import { SAMPLE_SOURCES, SAMPLE_STREAM, SAMPLE_WIKI } from "./sample";

// 샘플: 질문을 보내도 서버·AI·DB를 부르지 않는다. 다음 질문이 어떻게 끝날지(next)를 주소로 고르고, 시작 모습(start)도 고른다.
export type Next = "normal" | "nomatch" | "cutoff" | "limit" | "busy" | "auth" | "retry" | "input";

const FIRST: AskMessage = { id: "u0", role: "user", text: "화랑은 어떤 사람들이었나요?" };
const START: Record<string, { status: AskStatus; messages: AskMessage[] }> = {
  waiting: { status: "submitted", messages: [FIRST] },
  streaming: { status: "streaming", messages: [FIRST, { id: "a0", role: "assistant", text: SAMPLE_STREAM.slice(0, 40), state: "streaming" }] },
  done: { status: "ready", messages: [FIRST, { id: "a0", role: "assistant", text: SAMPLE_STREAM, state: "done", sources: SAMPLE_SOURCES }] },
  nomatch: { status: "ready", messages: [{ ...FIRST, text: "고려 시대의 수도는 어디였나요?" }, { id: "a0", role: "assistant", text: "", state: "noMatch" }] },
  cutoff: { status: "ready", messages: [FIRST, { id: "a0", role: "assistant", text: SAMPLE_STREAM.slice(0, 32), state: "interrupted" }] },
};

export function LibraryPreview({ loggedIn, wikiEmpty, next, start }: { loggedIn: boolean; wikiEmpty: boolean; next: Next; start: string }) {
  const init = START[start];
  const [status, setStatus] = useState<AskStatus>(init?.status ?? "ready");
  const [messages, setMessages] = useState<AskMessage[]>(init?.messages ?? []);
  const [error, setError] = useState<AskErrorKind | null>(null);
  const [draft, setDraft] = useState(start === "cutoff" ? FIRST.text : "");
  const [remaining, setRemaining] = useState(start === "done" ? 3 : 4);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);
  const later = (fn: () => void, ms: number) => void timers.current.push(setTimeout(fn, ms));

  const ask = () => {
    const q = draft.trim();
    setError(null);
    if (!q || q.length > MAX_QUESTION_CHARS || next === "input") return setError("input");
    if (next === "limit" || next === "busy" || next === "auth") return setError(next);
    const uid = `u${Date.now()}`;
    const aid = `a${Date.now()}`;
    setMessages((m) => [...m, { id: uid, role: "user", text: q }]);
    setDraft("");
    setStatus("submitted");
    later(() => {
      if (next === "nomatch") {
        setMessages((m) => [...m, { id: aid, role: "assistant", text: "", state: "noMatch" }]);
        return setStatus("ready");
      }
      if (next === "retry") {
        setDraft(q);
        setMessages((m) => m.filter((x) => x.id !== uid));
        setError("retry");
        return setStatus("ready");
      }
      setStatus("streaming");
      const words = SAMPLE_STREAM.split(" ");
      const stopAt = next === "cutoff" ? 5 : words.length;
      setMessages((m) => [...m, { id: aid, role: "assistant", text: "", state: "streaming" }]);
      words.slice(0, stopAt).forEach((_, i) =>
        later(() => {
          const text = words.slice(0, i + 1).join(" ");
          const last = i + 1 === stopAt;
          setMessages((m) => m.map((x) => (x.id === aid ? { ...x, text, state: last ? (next === "cutoff" ? "interrupted" : "done") : "streaming", sources: last && next !== "cutoff" ? SAMPLE_SOURCES : undefined } : x)));
          if (last) {
            if (next === "cutoff") setDraft(q);
            else setRemaining((r) => Math.max(0, r - 1));
            setStatus("ready");
          }
        }, 120 * (i + 1)),
      );
    }, 1200);
  };

  const ctrl: AskController = { status, messages, error, draft, setDraft, onAsk: ask, remaining };
  return <LibraryQa items={wikiEmpty ? [] : SAMPLE_WIKI} loggedIn={loggedIn} ctrl={ctrl} loginHref="/login?next=/library" />;
}
