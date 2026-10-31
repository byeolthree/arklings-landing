import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runCleanup } from "@/lib/cleanup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // 비밀값이 설정돼 있지 않으면 누구도 실행할 수 없다
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Vercel 예약 작업이 하루에 한 번 부른다(vercel.json). 서버 전용 열쇠를 쓰므로 비밀값(CRON_SECRET)이 맞을 때만 실행한다.
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const result = await runCleanup();
    return NextResponse.json({ ok: result.errors.length === 0, ...result }, { status: result.errors.length === 0 ? 200 : 500 });
  } catch {
    console.error("[cleanup] 정리 작업이 중간에 멈췄습니다.");
    return NextResponse.json({ ok: false, error: "cleanup_failed" }, { status: 500 });
  }
}
