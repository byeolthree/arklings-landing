// 브라우저에서 외부 분석 도구(Amplitude, GTM dataLayer)로 보내는 곳. lib/measure/track.ts가 부른다.
// 지킬 것: 자동 수집을 끈다 · 글 내용·이메일·이름·전체 주소는 보내지 않는다 · 키가 비면 보내지 않는다 · MEASURE_ENABLED와 「추적 안 함」을 따른다.
import { doNotTrack, ensureAnon } from "@/lib/measure/anon";
import { AMPLITUDE_API_KEY, AMPLITUDE_SERVER_ZONE, GTM_ID, MEASURE_ENABLED } from "@/lib/measure/config";
import { readFirstUtm } from "@/lib/measure/first-utm";
import type { UsageProps } from "@/lib/measure/events";

type Amp = typeof import("@amplitude/analytics-browser");
let identity: { userId: string | null; method: string | null } = { userId: null, method: null };
let loading: Promise<Amp | null> | null = null;

function enabled(): boolean {
  return MEASURE_ENABLED && typeof window !== "undefined" && !doNotTrack();
}

export function pushDataLayer(payload: Record<string, unknown>): void {
  if (!enabled() || !GTM_ID) return;
  (window.dataLayer ??= []).push(payload); // 타입은 @next/third-parties가 선언한 window.dataLayer
}

function applyUserProps(amp: Amp): void {
  try {
    if (identity.userId) amp.setUserId(identity.userId);
    else if (amp.getUserId()) amp.setUserId(undefined);
    const id = new amp.Identify();
    const utm = readFirstUtm();
    // 처음 들어온 UTM은 한 번 정해지면 바뀌지 않는다(setOnce)
    if (utm.source) id.setOnce("initial_utm_source", utm.source);
    if (utm.medium) id.setOnce("initial_utm_medium", utm.medium);
    if (utm.campaign) id.setOnce("initial_utm_campaign", utm.campaign);
    if (utm.content) id.setOnce("initial_utm_content", utm.content);
    if (identity.method) id.set("signup_method", identity.method);
    amp.identify(id);
  } catch {
    // 속성을 못 붙여도 화면 동작에는 영향이 없다
  }
}

function loadAmplitude(): Promise<Amp | null> {
  if (!enabled() || !AMPLITUDE_API_KEY) return Promise.resolve(null);
  loading ??= import("@amplitude/analytics-browser")
    .then(async (amp) => {
      await amp.init(AMPLITUDE_API_KEY, undefined, {
        deviceId: ensureAnon(), // 자체 DB 기록의 브라우저 무작위 값과 같은 값
        serverZone: AMPLITUDE_SERVER_ZONE,
        autocapture: false,
        remoteConfig: { fetchRemoteConfig: false },
      }).promise;
      applyUserProps(amp);
      return amp;
    })
    .catch(() => null);
  return loading;
}

// 로그인한 사람의 내부 번호와 가입 방식을 알린다(서버가 그린 화면에서 받는다). 로그아웃이면 userId는 null.
export function setMeasureIdentity(userId: string | null, method: string | null): void {
  identity = { userId, method };
  void loadAmplitude().then((amp) => amp && applyUserProps(amp));
}

export function sendExternal(event: string, props: UsageProps): void {
  if (!enabled()) return;
  pushDataLayer({ event, ...props });
  void loadAmplitude().then((amp) => amp?.track(event, { ...props, page: location.pathname }));
}
