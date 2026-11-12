// 요청이 이 사이트의 화면에서 온 것인지(Origin 주소와 접속 주소가 같은지). Server Action이 아닌 Route Handler는 이 확인을 직접 해야 한다.
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
