import { headers } from "next/headers";

// 지금 접속한 사이트 주소(https://도메인). 확인 메일의 링크, 알림 메일의 링크를 만들 때 쓴다.
export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const local = host.startsWith("localhost") || host.startsWith("127.");
  const proto = h.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${proto}://${host}`;
}
