"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";

const WITHDRAW_PHRASE = "탈퇴합니다";

export type WithdrawState = { error?: string };

// 회원 탈퇴. 계정·프로필·동의 기록·기획안·임시저장 이력·메일 횟수 기록이 함께 지워진다(DB의 연쇄 삭제).
// 내 앞으로 온 협업 신청은 받는 사람이 비워져 아무도 못 보는 상태가 되고, 접수 3개월 뒤 정리 작업이 지운다.
export async function withdrawAccount(_prev: WithdrawState, fd: FormData): Promise<WithdrawState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 풀렸어요. 다시 로그인한 뒤 시도해 주세요." };
  if (fd.get("agree") !== "on") return { error: "안내 내용을 확인했다는 칸에 체크해 주세요." };
  if (String(fd.get("phrase") ?? "").trim() !== WITHDRAW_PHRASE) return { error: `확인을 위해 「${WITHDRAW_PHRASE}」를 똑같이 입력해 주세요.` };

  try {
    const admin = createAdminClient();
    // 운영자 표시가 있는 계정이 사라지면 아클링스 앞 신청을 볼 사람이 없어지므로, 표시를 먼저 옮기도록 막는다.
    const { data: adminRow, error: adminErr } = await admin.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (adminErr) return { error: "지금은 탈퇴를 처리할 수 없어요. 잠시 뒤에 다시 시도해 주세요." };
    if (adminRow) return { error: "이 계정은 아클링스 신청함을 보는 계정이라 바로 탈퇴할 수 없어요. 담당자에게 먼저 알려 주세요." };

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return { error: "탈퇴를 처리하지 못했어요. 잠시 뒤에 다시 시도해 주세요." };
  } catch {
    return { error: "지금은 탈퇴를 처리할 수 없어요. 잠시 뒤에 다시 시도해 주세요." };
  }

  try {
    const supabase = await createAuthClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // 계정은 이미 지워졌다. 이 기기의 로그인 정보가 남아도 다음 확인에서 무효로 처리된다.
  }
  redirect("/withdrawn");
}
