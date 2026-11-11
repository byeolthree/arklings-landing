// 라이브러리 질의응답 요청 처리(서버 전용). app/api/library/ask/route.ts가 부른다. 시험할 수 있게 필요한 것을 밖에서 넘겨 받는다.
// Route Handler에는 Server Action이 기본으로 해 주는 출처 검사가 붙지 않으므로 여기서 직접 한다(계획 §6).
// 순서: 출처(Origin) → 로그인·이메일 확인 → 입력 검사(system 역할 거절 포함) → 위키 읽기·항목 고르기 → 오늘 자리 잡기 → 모델 호출(스트리밍).
//  · 관련 항목이 없으면 모델을 부르지 않고 자리도 잡지 않는다(비용이 없으므로). 위키를 못 읽은 것은 「없음」이 아니라 오류다.
//  · 답이 끊겼으면 완성된 답처럼 보이지 않게 오류 부분을 그대로 흘려 보내고(화면의 error), 끝나지 못한 호출은 자리를 돌려준다(시안: 끊긴 답도 횟수는 줄지 않는다).
//  · 근거 자료 이름(sources)은 모델이 쓴 글이 아니라 서버가 고른 항목에서 읽어 메시지 부가 정보(metadata)로 보낸다.
import { createUIMessageStream, createUIMessageStreamResponse, streamText, toUIMessageStream, type ModelMessage } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { MAX_QUESTION_CHARS } from "@/components/ai/types";
import type { CurrentUser } from "@/lib/auth";
import { classifyAiError } from "@/lib/ai/errors";
import { USAGE_TEXT } from "@/components/ai/usage-text";
import type { ModelHandle } from "@/lib/ai/model";
import { releaseAiUse, reserveAiUse } from "@/lib/ai/usage";
import { LIBRARY_ASK_INSTRUCTIONS, buildLibraryPrompt } from "@/lib/prompts/library-ask";
import { pickWikiItems, readPublicWiki } from "@/lib/wiki";

export const ASK_MAX_BODY_CHARS = 40_000;
export const ASK_MAX_MESSAGES = 12; // 보내 오는 대화 길이
export const ASK_HISTORY_FOR_MODEL = 6; // 모델에게 넘기는 최근 대화 수(비용이 대화 길이만큼 늘기 때문에 제한한다, 교재 10-2)
export const ASK_MAX_OUTPUT_TOKENS = 500;
export const ASK_TIMEOUT_MS = 40_000;

export type AskDeps = {
  getUser: () => Promise<CurrentUser | null>;
  supabase: () => Promise<SupabaseClient>;
  model: () => ModelHandle | null;
};

type Code = "login" | "input" | "limit" | "busy" | "auth" | "retry";
const STATUS: Record<Code, number> = { login: 401, input: 400, limit: 429, busy: 429, auth: 503, retry: 503 };
const json = (code: Code, message: string, status = STATUS[code]) => Response.json({ code, message }, { status, headers: { "Cache-Control": "no-store" } });

const FORBIDDEN_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
// 사용할 메시지 종류와 필드를 서버가 골라 읽는다: 사용자·도우미 메시지의 글 조각만. role: "system"이나 다른 조각(파일·도구 등)은 모두 거절한다(교재 10-2·10-3).
const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        parts: z.array(z.object({ type: z.literal("text"), text: z.string().max(4000) })).min(1).max(10),
      }),
    )
    .min(1)
    .max(ASK_MAX_MESSAGES),
});

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function handleLibraryAsk(req: Request, deps: AskDeps): Promise<Response> {
  // 1) 출처: 다른 사이트에서 몰래 보낸 요청은 막는다
  if (!sameOrigin(req)) return new Response(null, { status: 403 });

  // 2) 로그인·이메일 확인 (모델 호출 전에 거절)
  const user = await deps.getUser();
  if (!user) return json("login", "질문은 로그인한 뒤에 할 수 있어요.");
  if (!user.email || !user.emailConfirmed) return json("login", "이메일 확인을 먼저 마쳐 주세요.", 403);

  // 3) 입력 검사
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > ASK_MAX_BODY_CHARS * 3) return json("input", "요청이 너무 커요.", 413);
  let rawText: string;
  try {
    rawText = await req.text();
  } catch {
    return json("input", "요청을 읽지 못했어요.");
  }
  if (rawText.length > ASK_MAX_BODY_CHARS) return json("input", "요청이 너무 커요.", 413);
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return json("input", "요청 모양이 올바르지 않아요.");
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return json("input", "요청 모양이 올바르지 않아요.");
  const texts = parsed.data.messages.map((m) => ({ role: m.role, text: m.parts.map((p) => p.text).join("\n") }));
  const last = texts[texts.length - 1];
  if (last.role !== "user") return json("input", "마지막 메시지는 질문이어야 해요.");
  if (texts.some((t) => FORBIDDEN_CHARS.test(t.text))) return json("input", "쓸 수 없는 문자가 들어 있어요.");
  const question = last.text.trim();
  if (!question || question.length > MAX_QUESTION_CHARS) return json("input", `질문은 비워 둘 수 없고 ${MAX_QUESTION_CHARS}자 이내로 써 주세요.`);

  // 4) 위키 읽기 → 관련 항목 고르기 (못 읽으면 오류, 관련 항목이 없으면 모델을 부르지 않는다)
  const sb = await deps.supabase();
  const wiki = await readPublicWiki(sb);
  if (!wiki.ok) return json("retry", "자료를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.");
  const picked = pickWikiItems(question, wiki.items);
  if (picked.length === 0) {
    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({ type: "start", messageMetadata: { noMatch: true, sources: [] } });
        writer.write({ type: "finish", finishReason: "stop" });
      },
    });
    return createUIMessageStreamResponse({ stream, headers: { "Cache-Control": "no-store" } });
  }
  const sources = [...new Set(picked.map((p) => p.source))];

  // 5) 모델 고르기 → 오늘 자리 잡기
  const handle = deps.model();
  if (!handle) return json("auth", "AI 연결에 문제가 있어요. 잠시 뒤 다시 시도해 주세요.");
  const hold = await reserveAiUse(sb, "library_ask");
  if (!hold.ok) return hold.reason === "limit" ? json("limit", USAGE_TEXT.serverLimit) : json("auth", "AI 연결에 문제가 있어요. 잠시 뒤 다시 시도해 주세요.");

  // 6) 모델 호출(스트리밍). 이전 대화는 최근 몇 개만, 이번 질문은 참고 자료로 감싸서 넘긴다.
  const history = texts.slice(0, -1).slice(-(ASK_HISTORY_FOR_MODEL - 1));
  const messages: ModelMessage[] = [...history.map((m) => ({ role: m.role, content: m.text }) as ModelMessage), { role: "user", content: buildLibraryPrompt(question, picked) }];
  let gotText = false;
  let released = false;
  const giveBack = async () => {
    if (released) return;
    released = true;
    await releaseAiUse(sb, hold.holdId);
  };

  const result = streamText({
    model: handle.model,
    instructions: LIBRARY_ASK_INSTRUCTIONS,
    messages,
    maxRetries: 0,
    maxOutputTokens: ASK_MAX_OUTPUT_TOKENS,
    timeout: { totalMs: ASK_TIMEOUT_MS },
    abortSignal: req.signal,
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta") gotText = true;
    },
    onError: async ({ error }) => {
      const { code, status } = classifyAiError(error);
      console.error("[ai] 질의응답 호출 실패", { code, status, gotText }); // 키와 사용자 글은 남기지 않는다
      // 답이 끝나지 못한 호출은 자리를 돌려준다(시안: 끊긴 답도 「오늘 횟수는 줄지 않았어요」). 사용자가 직접 연결을 끊은 경우(abort)는 돌려주지 않는다.
      await giveBack();
    },
  });

  const stream = toUIMessageStream({
    stream: result.stream,
    messageMetadata: ({ part }) => {
      if (part.type === "start") return { sources, noMatch: false };
      if (part.type === "finish") return { sources, noMatch: false, finishReason: String(part.finishReason) };
      return undefined;
    },
    onError: (error) => `answer_failed:${classifyAiError(error).code}`, // 내부 오류 문구는 보내지 않고 종류만 보낸다(auth·busy·retry·schema)
  });
  return createUIMessageStreamResponse({ stream, headers: { "Cache-Control": "no-store" } });
}
