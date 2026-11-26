import type { Metadata } from "next";
import { NotificationList } from "@/components/projects/notification-list";
import { requireUser } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";

export const metadata: Metadata = { title: "알림", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// 알림 목록. 읽기는 로그인한 본인의 권한(RLS)으로만 하고, 내 알림만 돌아온다.
export default async function NotificationsPage() {
  await requireUser("/notifications");
  return <NotificationList rows={await listNotifications(50)} />;
}
