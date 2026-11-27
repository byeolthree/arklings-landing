// AI 단가 분석 한 번의 순서(서버 전용). app/actions/ai-estimate.ts가 부른다. 필요한 것을 밖에서 넘겨 받는다.
// 순서: 로그인·이메일 확인 → 운영자 확인 → 입력 검사 → 모델 고르기 → 하루 자리 잡기 → 모델 호출(검사 실패 시 한 번 더) → (실패하면 자리 돌려주기).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CurrentUser } from "@/lib/auth";
import { ROLES, type Role } from "@/lib/collab";
import { runEstimate } from "@/lib/ai/estimate";
import type { EstimateItem } from "@/lib/ai/estimate-schema";
import type { ModelHandle } from "@/lib/ai/model";
import { releaseAiUse, reserveAiUse } from "@/lib/ai/usage";
import type { EstimateInput } from "@/lib/prompts/estimate-project";
import { isObj } from "@/lib/utils";

export type EstimateErrorCode = "login" | "admin" | "input" | "limit" | "auth" | "busy" | "retry" | "schema";
export type EstimateActionResult = { ok: true; items: EstimateItem[]; total: number } | { ok: false; code: EstimateErrorCode; error: string };
export type EstimateDeps = {
  getUser: () => Promise<CurrentUser | null>;
  isAdmin: () => Promise<boolean>;
  supabase: () => Promise<SupabaseClient>;
  model: () => ModelHandle | null;
};

const CONNECT = "AI 연결에 문제가 있어요. 잠시 뒤 다시 시도해 주세요.";
const fail = (code: EstimateErrorCode, error: string): EstimateActionResult => ({ ok: false, code, error });
const FAIL_MESSAGES = {
  auth: CONNECT,
  busy: "지금 요청이 몰려 있어요. 잠시 뒤 다시 시도해 주세요.",
  retry: "단가 분석을 마치지 못했어요. 다시 시도해 주세요.",
  schema: "결과를 화면에 보여 드리지 못했어요. 다시 시도해 주세요.",
} as const;

const hasBadChars = (s: string) => /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/.test(s);

// 공고 올리기(app/actions/projects.ts)와 같은 길이·문자 규칙. 소개 글은 비어 있어도 된다.
export function parseEstimateInput(raw: unknown): { ok: true; input: EstimateInput } | { ok: false; error: string } {
  if (!isObj(raw)) return { ok: false, error: "입력 모양이 올바르지 않아요." };
  const { title, summary, description, roles } = raw;
  if (typeof title !== "string" || typeof summary !== "string" || typeof description !== "string" || !Array.isArray(roles)) return { ok: false, error: "입력 모양이 올바르지 않아요." };
  const t = title.trim();
  const s = summary.trim();
  const d = description.trim();
  if (t.length < 2 || t.length > 60 || hasBadChars(t)) return { ok: false, error: "제목은 2자 이상 60자 이하로 적은 뒤에 분석할 수 있어요." };
  if (s.length < 10 || s.length > 120 || hasBadChars(s)) return { ok: false, error: "한 줄 요약은 10자 이상 120자 이하로 적은 뒤에 분석할 수 있어요." };
  if (d.length > 3000 || hasBadChars(d)) return { ok: false, error: "소개 글은 3000자까지 적을 수 있어요." };
  const list = roles.map(String);
  if (list.length < 1 || list.length > 6 || new Set(list).size !== list.length || !list.every((r) => r in ROLES)) return { ok: false, error: "찾는 역할을 한 개 이상 고른 뒤에 분석할 수 있어요." };
  return { ok: true, input: { title: t, summary: s, description: d, roles: list as Role[] } };
}

export async function estimateProjectFlow(raw: unknown, deps: EstimateDeps): Promise<EstimateActionResult> {
  // 1) 로그인 · 이메일 확인 · 운영자 (모델 호출 전에 거절)
  const user = await deps.getUser();
  if (!user) return fail("login", "로그인이 풀렸어요. 다시 로그인한 뒤 시도해 주세요.");
  if (!user.email || !user.emailConfirmed) return fail("login", "이메일 확인을 먼저 마쳐 주세요.");
  if (!(await deps.isAdmin())) return fail("admin", "운영자만 쓸 수 있어요.");

  // 2) 입력 검사
  const parsed = parseEstimateInput(raw);
  if (!parsed.ok) return fail("input", parsed.error);

  // 3) 모델 고르기 (키·모델 이름이 없으면 호출하지 않는다)
  const handle = deps.model();
  if (!handle) return fail("auth", CONNECT);

  // 4) 오늘 자리 하나 잡기. 검사 실패로 한 번 더 부르는 것도 같은 자리 안에서 한다.
  const sb = await deps.supabase();
  const hold = await reserveAiUse(sb, "estimate_project");
  if (!hold.ok) return hold.reason === "limit" ? fail("limit", "오늘 횟수를 다 썼어요. 내일 다시 가능해요.") : fail("auth", CONNECT);

  // 5) 모델 호출. 실패하면 잡은 자리를 돌려준다(결과를 받았으면 돌려주지 않는다).
  const out = await runEstimate({ handle, input: parsed.input });
  if (!out.ok) {
    await releaseAiUse(sb, hold.holdId);
    return fail(out.code, FAIL_MESSAGES[out.code]);
  }
  return { ok: true, items: out.value.items, total: out.value.total };
}
