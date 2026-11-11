// 사용 기록(0021)의 행동 종류와 검사 규칙. 브라우저·서버가 함께 쓴다. DB(0021)의 허용 목록과 같은 이름이어야 한다.
// 기록하는 것은 행동의 종류·시각·화면 경로·작은 부가 값뿐이다. 글 내용·이메일·이름은 기록하지 않는다.
//
// 각 행동의 부가 값(props)은 여기에 적은 키와 값만 받는다(그 밖의 키·값은 거절).
export const USAGE_EVENTS = {
  planner_open: {}, // 기획안 화면 열기
  plan_save: { mode: ["server", "local"] }, // 저장: 로그인해서 서버에 저장 / 로그인하지 않아 이 브라우저에만 저장
  ai_evaluate_click: {}, // AI 평가 누르기
  library_ask: {}, // 라이브러리 질문하기
  portfolio_start_click: {}, // 포트폴리오 작성하기 누르기
  signup: { method: ["email"] }, // 가입(이메일 가입 요청)
  login: { method: ["email", "google", "kakao"] }, // 로그인
} as const satisfies Record<string, Record<string, readonly string[]>>;

export type UsageEvent = keyof typeof USAGE_EVENTS;
export type UsageProps = Record<string, string>;

// 브라우저가 만든 무작위 값을 담는 쿠키 이름과 모양
export const ANON_COOKIE = "arklings_anon";
export const ANON_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;

export type UsageRecord = { event: UsageEvent; anonId: string | null; page: string | null; props: UsageProps };
export type UsageParse = { ok: true; value: UsageRecord } | { ok: false };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// 화면 경로만 남긴다(? 뒤와 # 뒤는 버린다). 우리 화면의 주소 글자만 받는다.
export function normalizePage(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 200) return null;
  const path = raw.split(/[?#]/)[0];
  if (path.length === 0 || path.length > 100 || !/^\/[A-Za-z0-9/_.~%-]*$/.test(path)) return null;
  return path;
}

// 요청에서 온 값을 검사한다. 허용 목록에 없는 행동, 정해진 키·값 밖의 부가 값은 모두 거절한다.
export function parseUsageEvent(raw: unknown): UsageParse {
  if (!isObj(raw)) return { ok: false };
  const { event, anonId, page, props } = raw;
  if (typeof event !== "string" || !Object.prototype.hasOwnProperty.call(USAGE_EVENTS, event)) return { ok: false };
  const spec = USAGE_EVENTS[event as UsageEvent] as Record<string, readonly string[]>;

  let anon: string | null = null;
  if (anonId !== undefined && anonId !== null) {
    if (typeof anonId !== "string" || !ANON_ID_RE.test(anonId)) return { ok: false };
    anon = anonId;
  }
  let pagePath: string | null = null;
  if (page !== undefined && page !== null) {
    pagePath = normalizePage(page);
    if (pagePath === null) return { ok: false };
  }

  const out: UsageProps = {};
  if (props !== undefined && props !== null) {
    if (!isObj(props)) return { ok: false };
    for (const [k, v] of Object.entries(props)) {
      if (!Object.prototype.hasOwnProperty.call(spec, k) || typeof v !== "string" || !spec[k].includes(v)) return { ok: false };
      out[k] = v;
    }
  }
  return { ok: true, value: { event: event as UsageEvent, anonId: anon, page: pagePath, props: out } };
}
