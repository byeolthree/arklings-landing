// 로그인 뒤에 돌아갈 주소(next)는 "같은 사이트 안의 경로"만 허용한다.
// https://…, //…, \… 처럼 다른 사이트로 보낼 수 있는 값은 모두 기본 주소로 바꾼다.
export const DEFAULT_NEXT = "/mypage";

const MAX_LENGTH = 300;

export function safeNext(raw: string | null | undefined, fallback: string = DEFAULT_NEXT): string {
  if (!raw) return fallback;
  let value = raw.trim();
  if (value.length === 0 || value.length > MAX_LENGTH) return fallback;

  // 주소창에 한 번 더 인코딩된 값(%2F%2F 등)으로 우회하는 경우까지 풀어서 확인한다.
  let decoded = value;
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return fallback;
    }
  }

  const bad = (s: string) =>
    !s.startsWith("/") || // 반드시 "/"로 시작하는 사이트 안 경로
    s.startsWith("//") || // //example.com
    s.includes("\\") || // /\example.com
    /[\u0000-\u001f\u007f]/.test(s) || // 줄바꿈 등 제어 문자
    /^\/[a-z][a-z0-9+.-]*:/i.test(s); // /javascript:… 같은 형태

  if (bad(value) || bad(decoded)) return fallback;

  // 새 주소를 만들어 보았을 때 같은 사이트로 남는지 마지막으로 확인한다.
  try {
    const base = "http://same-site.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    value = url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
  return value;
}
