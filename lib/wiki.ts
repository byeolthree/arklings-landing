// 라이브러리 위키 읽기와 항목 고르기. 공개로 켠 항목만 읽는다(0019의 읽기 규칙이 DB에서 한 번 더 막는다). 서버 전용 열쇠는 쓰지 않는다.
// 읽는 데 실패한 것과 항목이 없는 것은 다르다(교재 10-2: 조회 오류를 빈 목록으로 바꾸면 「자료가 없다」는 거짓 안내가 나온다).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WikiItem } from "@/components/ai/types";

export type WikiRead = { ok: true; items: WikiItem[] } | { ok: false };

export async function readPublicWiki(sb: SupabaseClient): Promise<WikiRead> {
  try {
    const { data, error } = await sb.from("library_wiki").select("id, question, answer, source, era").eq("is_public", true).order("created_at", { ascending: false }).limit(200);
    if (error || !Array.isArray(data)) return { ok: false };
    return { ok: true, items: data as WikiItem[] };
  } catch {
    return { ok: false };
  }
}

// ── 질문과 가까운 항목 고르기 ──
// 질문과 항목의 낱말이 겹치는지로 고른다(검색 방식 RAG가 필요해지기 전의 단순한 방법, 계획 P4).
//  · 겹치는 낱말이 하나도 없으면 빈 목록 → 모델을 부르지 않고 「이 자료에는 없는 내용이에요」로 끝낸다.
//  · 겹치는 것이 있으면, 항목이 아주 적을 때(SMALL_WIKI 이하)는 전부, 그보다 많으면 점수가 높은 PICK_MAX개를 고른다.
// 한계: 낱말이 그대로 들어 있어야 겹친 것으로 본다(비슷한 뜻의 다른 낱말은 못 찾는다).
export const SMALL_WIKI = 5;
export const PICK_MAX = 3;

const STOP = new Set(["무엇", "뭐예요", "뭔가요", "어떤", "어떻게", "어디", "언제", "누구", "누가", "왜", "알려", "알려줘", "주세요", "설명", "대해", "대한", "관련", "이에요", "인가요", "있나요", "있어요", "하나요", "했나요", "였나요", "이었나요", "무슨", "어느", "그리고", "그런데", "혹시", "정말", "좀"]);
const PARTICLES1 = new Set(["은", "는", "이", "가", "을", "를", "의", "에", "도", "만", "와", "과", "로", "랑"]);
const PARTICLES2 = new Set(["에서", "에게", "으로", "까지", "부터", "이란", "에는", "이다", "이에", "처럼"]);

export function questionTerms(question: string): string[] {
  const out = new Set<string>();
  const tokens = question.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (const t of tokens) {
    const cands = [t];
    if (t.length >= 3 && PARTICLES1.has(t.slice(-1))) cands.push(t.slice(0, -1));
    if (t.length >= 4 && PARTICLES2.has(t.slice(-2))) cands.push(t.slice(0, -2));
    for (const c of cands) if (c.length >= 2 && !STOP.has(c)) out.add(c);
  }
  return [...out];
}

export function pickWikiItems(question: string, items: WikiItem[]): WikiItem[] {
  const terms = questionTerms(question);
  if (terms.length === 0) return [];
  const scored = items
    .map((it) => {
      const hay = `${it.question} ${it.answer}`.toLowerCase();
      const head = it.question.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (head.includes(t)) score += t.length * 2;
        else if (hay.includes(t)) score += t.length;
      }
      return { it, score };
    })
    .filter((x) => x.score > 0);
  if (scored.length === 0) return [];
  if (items.length <= SMALL_WIKI) return items;
  return scored.sort((a, b) => b.score - a.score).slice(0, PICK_MAX).map((x) => x.it);
}
