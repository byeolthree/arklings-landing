"use server";

import { revalidatePath } from "next/cache";
import { CONFIRM_FIRST_MESSAGE, getCurrentUser, isConfirmed } from "@/lib/auth";
import { UUID_RE } from "@/lib/collab";
import { BUCKET } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";

export type AdminDeleteState = { message?: string; done?: boolean };

const LOGIN_MESSAGE = "로그인이 풀렸어요. 다시 로그인한 뒤 시도해 주세요.";
const FAILED = "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.";

// 운영자 목록의 「삭제」. 화면에서 막았더라도 이 동작이 맨 위에서 로그인·이메일 확인·운영자 표시를 다시 확인한다.
//  · 남에게 온 신청: 실제 신청은 건드리지 않고, 운영자 목록에서만 치운다(기록은 남고 지표에는 계속 센다).
//  · 아클링스 앞으로 온 신청: 운영자가 받는 사람이라 실제 신청과 첨부 파일도 함께 지우고, 목록에서도 치운다.
// 모두 로그인한 본인의 권한(RLS)으로 실행한다. 서버 전용 열쇠는 첨부 파일 지우기에만 쓴다.
export async function adminDeleteLog(requestId: string): Promise<AdminDeleteState> {
  const user = await getCurrentUser();
  if (!user) return { message: LOGIN_MESSAGE };
  if (!isConfirmed(user)) return { message: CONFIRM_FIRST_MESSAGE };
  if (!UUID_RE.test(requestId)) return { message: FAILED };

  try {
    const sb = await createAuthClient();
    const admin = await sb.rpc("is_admin");
    if (admin.error || admin.data !== true) return { message: "운영자만 할 수 있어요." };

    const { data: log, error: logErr } = await sb
      .from("collab_log")
      .select("request_id, recipient_kind, request_deleted_at")
      .eq("request_id", requestId)
      .maybeSingle();
    if (logErr || !log) return { message: FAILED };

    if (log.recipient_kind === "arklings" && !log.request_deleted_at) {
      const { data: cur } = await sb.from("collab_requests").select("attachment_path").eq("id", requestId).maybeSingle();
      if (cur) {
        const { data: deleted, error } = await sb.from("collab_requests").delete().eq("id", requestId).select("id");
        if (error || !deleted || deleted.length === 0) return { message: FAILED };
        const path = cur.attachment_path as string | null;
        if (path) {
          try {
            await createAdminClient().storage.from(BUCKET).remove([path]);
          } catch {
            console.error("[admin] 첨부 파일을 지우지 못했습니다(짝 없는 파일이 남았을 수 있음).");
          }
        }
      }
    }

    const { error: hideErr } = await sb.rpc("admin_hide_collab_log", { p_ids: [requestId] });
    if (hideErr) {
      console.error("[admin] 목록에서 치우지 못했습니다.", hideErr);
      return { message: FAILED };
    }
  } catch (e) {
    console.error("[admin] 삭제 중 오류", e);
    return { message: FAILED };
  }
  revalidatePath("/admin");
  revalidatePath("/collab");
  return { done: true };
}
