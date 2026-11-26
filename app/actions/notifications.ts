"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, isConfirmed } from "@/lib/auth";
import { notificationTarget, type NotificationKind } from "@/lib/notifications";
import { createAuthClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/utils";

// 알림 읽음 처리. 맨 위에서 로그인·이메일 확인을 다시 확인하고, 로그인한 본인의 권한으로 DB 함수 mark_notifications_read를 부른다
// (함수가 내 알림만 읽음으로 바꾼다). 알림을 만들거나 고치거나 지우는 길은 없다.

// 알림 하나를 누르면: 읽음 처리한 뒤 그 알림의 이동 주소로 보낸다. 내 알림이 아니거나 없으면 알림 목록으로 돌아간다.
export async function openNotification(fd: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !isConfirmed(user)) redirect("/login?next=%2Fnotifications");
  const id = String(fd.get("notification_id") ?? "");
  if (!UUID_RE.test(id)) redirect("/notifications");

  let target = "/notifications";
  try {
    const sb = await createAuthClient();
    // 내 알림만 읽힌다(RLS). 남의 알림 번호를 보내도 비어 돌아온다.
    const { data } = await sb.from("notifications").select("kind, href").eq("id", id).maybeSingle();
    if (data) {
      await sb.rpc("mark_notifications_read", { p_ids: [id] });
      target = notificationTarget((data as { kind: NotificationKind }).kind, (data as { href: string }).href);
    }
  } catch {
    target = "/notifications";
  }
  revalidatePath("/", "layout"); // 상단 종 아이콘 개수
  redirect(target);
}

// 안 읽은 알림을 모두 읽음으로 한다.
export async function markAllNotificationsRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !isConfirmed(user)) redirect("/login?next=%2Fnotifications");
  try {
    await (await createAuthClient()).rpc("mark_notifications_read", { p_ids: null });
  } catch {
    // 실패해도 목록을 다시 보여 주면 읽지 않음 표시가 그대로 남아 있어 알 수 있다.
  }
  revalidatePath("/", "layout");
  revalidatePath("/notifications");
}
