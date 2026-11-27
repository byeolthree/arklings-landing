import { createAuthClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

// 알림(0032 notifications). 읽기는 로그인한 본인의 권한(RLS)으로만 하고, 내 알림만 돌아온다. 쓰기는 DB 함수만 한다
// (알림은 DB 함수 안에서만 들어가고, 읽음 처리는 mark_notifications_read 함수로만 한다).

export type NotificationKind =
  | "project_new_application"
  | "project_accepted"
  | "project_auto_rejected"
  | "project_rejected"
  | "project_closed"
  | "contract_offered"
  | "contract_agreed"
  | "contract_declined"
  | "contract_signed"
  | "contract_cancelled"
  | "payment_paid"
  | "delivery_requested"
  | "work_completed";

export type NotificationRow = { id: string; kind: NotificationKind; href: string; body: string; readAt: string | null; createdAt: string };

// 읽지 않은 알림 개수. 세지 못하면 null(상단 종 아이콘은 개수 표시만 생략한다).
export async function countUnreadNotifications(): Promise<number | null> {
  try {
    const { count, error } = await (await createAuthClient()).from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    return error ? null : (count ?? 0);
  } catch {
    return null;
  }
}

// 내 알림 최근 것부터. 못 읽으면 null.
export async function listNotifications(limit = 50): Promise<NotificationRow[] | null> {
  try {
    const { data, error } = await (await createAuthClient())
      .from("notifications")
      .select("id, kind, href, body, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(limit, 100)));
    if (error) return null;
    return ((data ?? []) as { id: string; kind: NotificationKind; href: string; body: string; read_at: string | null; created_at: string }[]).map((r) => ({
      id: r.id,
      kind: r.kind,
      href: r.href,
      body: r.body,
      readAt: r.read_at,
      createdAt: r.created_at,
    }));
  } catch {
    return null;
  }
}

// 알림을 누르면 가는 곳. 같은 사이트 안 경로만 허용하고, 「새 지원」 알림은 지원자 관리 화면으로 보낸다
// (DB 함수는 공고 상세 주소만 저장하는데, 새 지원을 받은 운영자에게 필요한 곳은 지원자 관리다).
export function notificationTarget(kind: NotificationKind, href: string): string {
  const path = safeNext(href, "/notifications");
  return kind === "project_new_application" && /^\/projects\/[0-9a-f-]{36}$/i.test(path) ? `${path}/manage` : path;
}

// 상단 종 아이콘 개수 = 접수 상태 협업 신청 수 + 읽지 않은 알림 수. 한쪽을 못 세면 0으로 보고, 둘 다 못 세면 개수를 숨긴다(null).
export function bellCount(collab: number | null, unread: number | null): number | null {
  if (collab === null && unread === null) return null;
  return (collab ?? 0) + (unread ?? 0);
}
