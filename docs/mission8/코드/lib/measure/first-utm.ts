// 홈(public/landing.html)이 브라우저에 남긴 「처음 들어온 UTM」을 읽는다(티켓 006). 읽기만 하고 쓰지 않는다.
// 값은 짧은 글자(영문·숫자·_ - . 등)만 받고, 그 밖의 것은 버린다.
import { FIRST_UTM_KEY } from "@/lib/measure/config";

export type FirstUtm = { source?: string; medium?: string; campaign?: string; content?: string };
const KEYS = ["source", "medium", "campaign", "content"] as const;
const SAFE = /^[\w\s.+%:\-가-힣]{1,100}$/;

export function readFirstUtm(): FirstUtm {
  const out: FirstUtm = {};
  try {
    const raw = window.localStorage.getItem(FIRST_UTM_KEY);
    const obj: unknown = raw ? JSON.parse(raw) : null;
    if (obj && typeof obj === "object") {
      for (const k of KEYS) {
        const v = (obj as Record<string, unknown>)[k];
        if (typeof v === "string" && SAFE.test(v)) out[k] = v;
      }
    }
  } catch {
    // 저장소를 못 읽으면 속성 없이 보낸다
  }
  return out;
}
