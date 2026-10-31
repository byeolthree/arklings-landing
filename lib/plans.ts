// 기획안 내용의 모양과 검사 규칙. 화면(브라우저)과 서버가 같은 규칙을 쓴다.
// 서버는 화면이 보낸 값을 그대로 믿지 않고 여기서 다시 검사한다.

export const SECTIONS = [{ id: "logline", label: "로그라인" }] as const;
export type SectionId = (typeof SECTIONS)[number]["id"];

export const SLOT_LABELS = ["사건", "주인공", "장애물", "목표", "위험"] as const;
export const SLOT_COUNT = SLOT_LABELS.length;
export const CHECK_COUNT = 21; // 화면의 예/아니오 질문 수(칸 5개 × 3 + 마지막 확인 3 + 줄여서 확인 3)
export const MAX_SLOT_CHARS = 200;
export const MAX_TEXT_CHARS = 1000;
export const MAX_TITLE_CHARS = 60;
export const MAX_REVISIONS = 100;
export const DEFAULT_TITLE = "제목 없는 기획안";

export type CheckValue = "" | "yes" | "no";

// 편집 화면이 다루는 내용. 서버에는 아래 세 갈래(selections / suggested / edited)로 나눠 저장한다.
export type PlanDraft = {
  title: string;
  slots: string[]; // 사건·주인공·장애물·목표·위험에 사용자가 쓴 글
  checks: CheckValue[]; // 예/아니오 선택
  edited: string | null; // 사용자가 직접 고친 로그라인(고치지 않았으면 null)
};

export type StoredContent = {
  selections: { logline: { slots: string[]; checks: CheckValue[] } };
  suggested: { logline: { text: string; method: "template" } };
  edited: { logline?: string };
};

export function emptyDraft(): PlanDraft {
  return { title: "", slots: Array(SLOT_COUNT).fill(""), checks: Array(CHECK_COUNT).fill(""), edited: null };
}

// 「아클링스가 제안한 문장」을 만드는 곳은 이 함수 하나다. 나중에 AI가 문장을 만들게 되면 여기와 method 값만 바꾸면 된다.
export function buildSuggestion(slots: string[]): { text: string; method: "template" } {
  const v = SLOT_LABELS.map((label, k) => (slots[k] ?? "").trim() || `(${label})`);
  return {
    text: `${v[0]}이 벌어진 후, ${v[1]}은 ${v[2]}을 극복해야 ${v[3]}를 달성할 수 있다. 그렇지 않으면 ${v[4]}이 닥친다.`,
    method: "template",
  };
}

// 지금 화면에 보이는 로그라인: 고친 글이 있으면 그 글, 없으면 제안 문장.
export function loglineText(d: Pick<PlanDraft, "slots" | "edited">): string {
  return d.edited !== null ? d.edited : buildSuggestion(d.slots).text;
}

export function titleOrDefault(title: string, draft?: Pick<PlanDraft, "slots" | "edited">): string {
  const t = title.replace(/\s+/g, " ").trim();
  if (t) return t.slice(0, MAX_TITLE_CHARS);
  const first = (draft?.slots[0] ?? "").trim();
  return first ? first.slice(0, 30) : DEFAULT_TITLE;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const FORBIDDEN_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export type DraftResult = { ok: true; draft: PlanDraft } | { ok: false; error: string };

// 화면(또는 요청)에서 온 값을 검사해 안전한 PlanDraft로 만든다.
export function parseDraft(raw: unknown): DraftResult {
  if (!isObj(raw)) return { ok: false, error: "기획안 내용 형식이 올바르지 않아요." };
  const { title, slots, checks, edited } = raw;

  if (typeof title !== "string") return { ok: false, error: "기획안 제목 형식이 올바르지 않아요." };
  const cleanTitle = title.replace(/\s+/g, " ").trim();
  if (cleanTitle.length > MAX_TITLE_CHARS) return { ok: false, error: `제목은 ${MAX_TITLE_CHARS}자 이내로 써 주세요.` };

  if (!Array.isArray(slots) || slots.length !== SLOT_COUNT || !slots.every((s) => typeof s === "string")) {
    return { ok: false, error: "기획안 내용 형식이 올바르지 않아요." };
  }
  if ((slots as string[]).some((s) => s.length > MAX_SLOT_CHARS)) {
    return { ok: false, error: `각 칸은 ${MAX_SLOT_CHARS}자 이내로 써 주세요.` };
  }

  if (!Array.isArray(checks) || checks.length !== CHECK_COUNT || !checks.every((c) => c === "" || c === "yes" || c === "no")) {
    return { ok: false, error: "기획안 내용 형식이 올바르지 않아요." };
  }

  let editedText: string | null = null;
  if (edited !== null && edited !== undefined) {
    if (typeof edited !== "string") return { ok: false, error: "기획안 내용 형식이 올바르지 않아요." };
    if (edited.length > MAX_TEXT_CHARS) return { ok: false, error: `로그라인은 ${MAX_TEXT_CHARS}자 이내로 써 주세요.` };
    editedText = edited;
  }

  const all = [cleanTitle, ...(slots as string[]), editedText ?? ""];
  if (all.some((s) => FORBIDDEN_CHARS.test(s))) return { ok: false, error: "쓸 수 없는 문자가 들어 있어요." };

  return {
    ok: true,
    draft: { title: cleanTitle, slots: (slots as string[]).map((s) => s.replace(/\r\n?/g, "\n")), checks: checks as CheckValue[], edited: editedText === null ? null : editedText.replace(/\r\n?/g, "\n") },
  };
}

// 저장용으로 세 갈래로 나눈다. 제안 문장은 서버가 칸 내용에서 다시 만든다(화면이 보낸 제안 문장은 믿지 않는다).
export function toStored(d: PlanDraft): StoredContent {
  return {
    selections: { logline: { slots: d.slots, checks: d.checks } },
    suggested: { logline: buildSuggestion(d.slots) },
    edited: d.edited !== null ? { logline: d.edited } : {},
  };
}

// 저장된 세 갈래를 편집 화면 내용으로 되돌린다. 모양이 이상하면 null(깨진 기록을 화면에 싣지 않는다).
export function fromStored(title: string, selections: unknown, edited: unknown): PlanDraft | null {
  if (!isObj(selections) || !isObj(selections.logline)) return null;
  const lg = selections.logline;
  const parsed = parseDraft({
    title,
    slots: lg.slots,
    checks: lg.checks,
    edited: isObj(edited) && typeof edited.logline === "string" ? edited.logline : null,
  });
  return parsed.ok ? parsed.draft : null;
}

// 공개용 사본(비로그인 방문자가 읽는 것). 이력·선택지는 싣지 않고 완성된 글만 담는다.
export type PublicContent = { sections: { id: SectionId; label: string; text: string }[]; answers: { label: string; text: string }[] };

export function toPublicContent(d: PlanDraft): PublicContent {
  return {
    sections: [{ id: "logline", label: "로그라인", text: loglineText(d) }],
    answers: SLOT_LABELS.map((label, k) => ({ label, text: d.slots[k].trim() })).filter((a) => a.text),
  };
}

// 이력 목록에 보여 줄 짧은 미리보기
export function previewOf(d: PlanDraft, max = 48): string {
  const t = loglineText(d).replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

// 기획안 화면 아래쪽 패널(공개 여부·이력 목록)에 쓰는 값. 서버가 만들어 화면에 넘긴다(시각은 한국 시간 글자로 미리 바꿔서).
export type RevisionItem = { id: string; createdAt: string; preview: string; edited: boolean };
export type PlanInfo = { id: string; isPublic: boolean; publishedAt: string | null };
export type PlanPanel = { plan: PlanInfo; revisions: RevisionItem[]; latest: PlanDraft };
