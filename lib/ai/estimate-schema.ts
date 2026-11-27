// AI 단가 분석 결과의 모양과 검사. 서버는 모델이 준 값을 그대로 믿지 않고 여기서 다시 검사한다.
// 모델에게 보여 주는 Zod 스키마(모양만)는 estimateModelSchema이고, 개수·정수·범위·총액 일치는 parseEstimateResult가 다시 검사한다.
import { z } from "zod";
import { FORBIDDEN_CHARS, isObj } from "@/lib/utils";

export const ESTIMATE_MIN_ITEMS = 1;
export const ESTIMATE_MAX_ITEMS = 12;
export const ESTIMATE_PRICE_MAX = 300_000_000; // 기능 하나의 단가 상한(원). 공고 보상 상한(10억 원)보다 작게 둔다.
export const ESTIMATE_NAME_MAX = 40;
export const ESTIMATE_DESC_MAX = 200;
export const ESTIMATE_BASIS_MAX = 240;

export const STRENGTHS = ["strong", "medium", "weak", "none"] as const;
export type EstimateStrength = (typeof STRENGTHS)[number];
export const STRENGTH_LABEL: Record<EstimateStrength, string> = { strong: "강함", medium: "중간", weak: "약함", none: "기준 없음" };

export type EstimateItem = { name: string; description: string; unitPrice: number; basis: string; strength: EstimateStrength };
export type EstimateResult = { items: EstimateItem[]; total: number };
export type EstimateParse = { ok: true; value: EstimateResult } | { ok: false; reason: string };

// 제공자의 구조화 출력은 개수·정수 같은 세부 규칙을 모두 지원하지 않을 수 있어 모양만 정한다.
export const estimateModelSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      unitPrice: z.number(),
      basis: z.string(),
      strength: z.enum(STRENGTHS),
    }),
  ),
  total: z.number(),
});

const clean = (s: string) => s.replace(/\r\n?/g, "\n").trim();

export function parseEstimateResult(raw: unknown): EstimateParse {
  if (!isObj(raw) || !Array.isArray(raw.items)) return { ok: false, reason: "items 목록이 없어요." };
  if (raw.items.length < ESTIMATE_MIN_ITEMS || raw.items.length > ESTIMATE_MAX_ITEMS) return { ok: false, reason: `기능은 ${ESTIMATE_MIN_ITEMS}~${ESTIMATE_MAX_ITEMS}개여야 해요.` };

  const items: EstimateItem[] = [];
  let sum = 0;
  for (let i = 0; i < raw.items.length; i++) {
    const it = raw.items[i];
    if (!isObj(it)) return { ok: false, reason: `${i + 1}번째 기능 모양이 올바르지 않아요.` };
    if (typeof it.name !== "string" || typeof it.description !== "string" || typeof it.basis !== "string") return { ok: false, reason: `${i + 1}번째 기능의 글 모양이 올바르지 않아요.` };
    const name = clean(it.name);
    const description = clean(it.description);
    const basis = clean(it.basis);
    if (!name || name.length > ESTIMATE_NAME_MAX) return { ok: false, reason: `${i + 1}번째 기능명의 길이가 맞지 않아요.` };
    if (!description || description.length > ESTIMATE_DESC_MAX) return { ok: false, reason: `${i + 1}번째 설명의 길이가 맞지 않아요.` };
    if (!basis || basis.length > ESTIMATE_BASIS_MAX) return { ok: false, reason: `${i + 1}번째 산정 근거의 길이가 맞지 않아요.` };
    if (FORBIDDEN_CHARS.test(name) || FORBIDDEN_CHARS.test(description) || FORBIDDEN_CHARS.test(basis)) return { ok: false, reason: "쓸 수 없는 문자가 들어 있어요." };
    if (typeof it.strength !== "string" || !(STRENGTHS as readonly string[]).includes(it.strength)) return { ok: false, reason: `${i + 1}번째 근거 강도가 올바르지 않아요.` };
    const strength = it.strength as EstimateStrength;
    const price = it.unitPrice;
    if (typeof price !== "number" || !Number.isSafeInteger(price)) return { ok: false, reason: `${i + 1}번째 단가가 정수가 아니에요.` };
    if (price < 0 || price > ESTIMATE_PRICE_MAX) return { ok: false, reason: `${i + 1}번째 단가가 범위를 벗어났어요.` };
    if (strength === "none" ? price !== 0 : price === 0) return { ok: false, reason: `${i + 1}번째 단가와 근거 강도가 맞지 않아요.` };
    sum += price;
    items.push({ name, description, unitPrice: price, basis, strength });
  }
  if (typeof raw.total !== "number" || !Number.isSafeInteger(raw.total)) return { ok: false, reason: "총액이 정수가 아니에요." };
  if (raw.total !== sum) return { ok: false, reason: "총액이 단가의 합과 달라요." }; // 서버가 다시 더해 확인한다
  return { ok: true, value: { items, total: sum } };
}
