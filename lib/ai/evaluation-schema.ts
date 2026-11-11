// AI 평가 결과의 모양과 검사(패키지 없이 쓰는 부분). 서버는 모델이 준 값을 그대로 믿지 않고 여기서 다시 검사한다.
// 칸 이름·순서는 lib/plans.ts의 SLOT_LABELS 한 곳을 따른다. 화면의 EvalSlot(components/ai/types.ts)과 같은 모양이다.
//
// 나중에 AI SDK의 `Output.object({ schema })`에 넘길 Zod 스키마는 패키지(zod) 설치 승인 뒤에 이 파일 옆에 더한다.
// 같은 모양이어야 하므로 아래 기준을 그대로 옮기면 된다:
//   z.object({ slots: z.array(z.object({
//     label: z.enum(SLOT_LABELS), status: z.enum(["ok", "needs"]),
//     reason: z.string().min(1).max(EVAL_REASON_MAX), fix: z.string().max(EVAL_FIX_MAX),
//   })).length(SLOT_COUNT) })
// 그 뒤에도 서버는 parseEvaluationResult로 한 번 더 검사한다(칸 순서, 보완 필요일 때 fix 필수).
import { SLOT_COUNT, SLOT_LABELS } from "@/lib/plans";

export const EVAL_REASON_MAX = 200;
export const EVAL_FIX_MAX = 200;
export const EVAL_SECTION = "logline" as const; // 평가 기준은 섹션(페이지) 단위로 갈아 끼운다(계획 4장)

export type EvalSlotResult = {
  label: (typeof SLOT_LABELS)[number];
  status: "ok" | "needs"; // 충족 / 보완 필요
  reason: string; // 이유 1~2문장
  fix: string; // 고칠 점 질문 한 문장. 충족이면 빈 글자
};
export type EvaluationResult = { slots: EvalSlotResult[] };

export type EvaluationParse = { ok: true; value: EvaluationResult } | { ok: false; reason: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const FORBIDDEN_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const clean = (s: string) => s.replace(/\r\n?/g, "\n").trim();

// 모델이 돌려준 값을 검사해 안전한 EvaluationResult로 만든다. 모양이 어긋나면 ok:false(화면에는 「결과를 읽지 못함」).
// 화면에는 글자로만 보이므로 HTML을 해석하지 않는다. 여기서는 길이·문자·순서만 본다.
export function parseEvaluationResult(raw: unknown): EvaluationParse {
  if (!isObj(raw) || !Array.isArray(raw.slots)) return { ok: false, reason: "slots 목록이 없어요." };
  if (raw.slots.length !== SLOT_COUNT) return { ok: false, reason: `칸이 ${SLOT_COUNT}개여야 해요.` };

  const slots: EvalSlotResult[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const s = raw.slots[i];
    if (!isObj(s)) return { ok: false, reason: `${i + 1}번째 칸 모양이 올바르지 않아요.` };
    if (s.label !== SLOT_LABELS[i]) return { ok: false, reason: `${i + 1}번째 칸 이름이 ${SLOT_LABELS[i]}이어야 해요.` };
    if (s.status !== "ok" && s.status !== "needs") return { ok: false, reason: `${SLOT_LABELS[i]} 상태가 올바르지 않아요.` };
    if (typeof s.reason !== "string" || typeof s.fix !== "string") return { ok: false, reason: `${SLOT_LABELS[i]} 글 모양이 올바르지 않아요.` };
    const reason = clean(s.reason);
    const fix = clean(s.fix);
    if (!reason || reason.length > EVAL_REASON_MAX) return { ok: false, reason: `${SLOT_LABELS[i]} 이유의 길이가 맞지 않아요.` };
    if (fix.length > EVAL_FIX_MAX) return { ok: false, reason: `${SLOT_LABELS[i]} 고칠 점이 너무 길어요.` };
    if (s.status === "needs" && !fix) return { ok: false, reason: `${SLOT_LABELS[i]} 칸이 보완 필요인데 고칠 점이 없어요.` };
    if (FORBIDDEN_CHARS.test(reason) || FORBIDDEN_CHARS.test(fix)) return { ok: false, reason: "쓸 수 없는 문자가 들어 있어요." };
    slots.push({ label: SLOT_LABELS[i], status: s.status, reason, fix: s.status === "ok" ? "" : fix });
  }
  return { ok: true, value: { slots } };
}
