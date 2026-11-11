// 어떤 모델로 답을 만들지 고른다. 서버에서만 쓴다(키는 환경 변수에만 있고 화면 번들에 들어가지 않는다).
//  · AI_FAKE_MODEL=1 : 가짜 모델. OpenAI를 부르지 않고 정해진 샘플 답으로 연결·오류·형식 경로만 시험한다(비용 0).
//    실제 사이트(VERCEL_ENV=production)에서는 켜져 있어도 쓰지 않는다.
//  · OPENAI_API_KEY와 OPENAI_MODEL이 모두 있으면 OpenAI 모델. 키는 코드에서 읽지 않는다(@ai-sdk/openai가 환경 변수에서 읽는다).
//  · 그 밖에는 null → 호출하는 쪽이 「AI 연결 문제」로 안내한다.
// 가짜 모델의 성공은 진짜 모델 품질의 증거가 아니다(교재 10-2·10-7). 가짜 모델 보고와 진짜 모델 보고는 따로 한다.
import { openai } from "@ai-sdk/openai";
import { APICallError, simulateReadableStream, type LanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";

export type ModelHandle = { model: LanguageModel; name: string; fake: boolean };

export function getModelHandle(): ModelHandle | null {
  if (process.env.AI_FAKE_MODEL === "1") {
    if (process.env.VERCEL_ENV === "production") return null;
    return { model: fakeModel(), name: "fake-model", fake: true };
  }
  const key = process.env.OPENAI_API_KEY;
  const id = process.env.OPENAI_MODEL;
  if (!key || !id) return null;
  return { model: openai(id), name: id, fake: false };
}

// ── 가짜 모델 ──
// 교재 10-5의 교육용 실패 입력처럼, 질문·글에 아래 낱말이 들어 있으면 그 실패를 흉내 낸다.
//   「한도 오류」 → 429(요청 몰림)  「연결 오류」 → 401(연결 문제)  「시간 초과」 → 시간 초과  「형식 오류」 → 모양이 틀린 결과  「끊김 시험」 → 답 도중에 끊김
const apiError = (status: number, body = "{}") => new APICallError({ message: "fake", url: "https://fake.invalid", requestBodyValues: {}, statusCode: status, responseBody: body });
const usage = (input: number, output: number) => ({
  inputTokens: { total: input, noCache: input, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: output, text: output, reasoning: undefined },
});

type PromptLike = { role: string; content: unknown }[];
function lastUserText(prompt: PromptLike): string {
  for (let i = prompt.length - 1; i >= 0; i--) {
    const m = prompt[i];
    if (m.role !== "user") continue;
    if (typeof m.content === "string") return m.content;
    if (Array.isArray(m.content)) return m.content.map((p) => (p && typeof p === "object" && "text" in p ? String((p as { text: unknown }).text) : "")).join("\n");
  }
  return "";
}
function failFor(text: string): Error | null {
  if (text.includes("한도 오류")) return apiError(429, '{"error":{"code":"rate_limit_exceeded"}}');
  if (text.includes("연결 오류")) return apiError(401, '{"error":{"code":"invalid_api_key"}}');
  if (text.includes("시간 초과")) return Object.assign(new Error("timeout"), { name: "TimeoutError" });
  return null;
}

const FAKE_EVAL = {
  slots: [
    { label: "사건", status: "ok", reason: "[가짜 모델 고정 결과] 이야기를 움직이는 계기가 한 문장에 드러나요.", fix: "" },
    { label: "주인공", status: "ok", reason: "[가짜 모델 고정 결과] 누구의 이야기인지 바로 알 수 있어요.", fix: "" },
    { label: "장애물", status: "needs", reason: "[가짜 모델 고정 결과] 장애물이 두 가지로 나뉘어 핵심이 흐려요.", fix: "주인공이 가장 먼저 넘어야 하는 장애물 하나는 무엇인가요?" },
    { label: "목표", status: "ok", reason: "[가짜 모델 고정 결과] 이루려는 일이 구체적이에요.", fix: "" },
    { label: "위험", status: "needs", reason: "[가짜 모델 고정 결과] 실패하면 잃는 것이 막연해요.", fix: "실패하면 주인공이 가장 아끼는 무엇을 잃나요?" },
  ],
};
const FAKE_ANSWER = "이 답은 가짜 모델이 정해 둔 시험용 답이에요. 서버가 고른 자료 안에서만 답하는 흐름을 확인하려는 것이며, 실제 AI의 답이 아니에요.";

function fakeModel() {
  return new MockLanguageModelV4({
    provider: "fake",
    modelId: "fake-model",
    doGenerate: async (options) => {
      const text = lastUserText(options.prompt as unknown as PromptLike);
      const err = failFor(text);
      if (err) throw err;
      const body = text.includes("형식 오류") ? '{"slots":[]}' : JSON.stringify(FAKE_EVAL);
      return { content: [{ type: "text" as const, text: body }], finishReason: { unified: "stop" as const, raw: undefined }, usage: usage(10, 20), warnings: [] };
    },
    doStream: async (options) => {
      const text = lastUserText(options.prompt as unknown as PromptLike);
      const err = failFor(text);
      if (err) throw err;
      const words = FAKE_ANSWER.split(" ");
      const cut = text.includes("끊김 시험");
      const deltas = (cut ? words.slice(0, 5) : words).map((w, i) => ({ type: "text-delta" as const, id: "t1", delta: i ? ` ${w}` : w }));
      const tail = cut
        ? [{ type: "error" as const, error: new Error("stream cut") }]
        : [{ type: "text-end" as const, id: "t1" }, { type: "finish" as const, finishReason: { unified: "stop" as const, raw: undefined }, logprobs: undefined, usage: usage(10, 20) }];
      return { stream: simulateReadableStream({ chunks: [{ type: "text-start" as const, id: "t1" }, ...deltas, ...tail], initialDelayInMs: 300, chunkDelayInMs: 60 }) };
    },
  });
}
