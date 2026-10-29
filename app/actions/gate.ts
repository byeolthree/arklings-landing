"use server";

import { redirect } from "next/navigation";
import { checkGatePassword, grantGateAccess, isGateConfigured, safeGateNext } from "@/lib/admin-gate";

export type GateState = { message?: string };

// 임시 조치: 운영자용 비밀번호를 맞게 입력하면 8시간 동안 열어 준다.
export async function unlockGate(_prev: GateState, fd: FormData): Promise<GateState> {
  const password = String(fd.get("password") ?? "");
  const next = safeGateNext(String(fd.get("next") ?? ""));

  // 비밀번호를 연달아 시도하는 것을 늦춘다.
  await new Promise((resolve) => setTimeout(resolve, 700));

  if (!isGateConfigured()) {
    return { message: "임시 비밀번호가 서버에 설정되어 있지 않아 열 수 없습니다. 운영자에게 알려 주세요." };
  }
  if (!password) return { message: "비밀번호를 입력해 주세요." };
  if (!checkGatePassword(password)) return { message: "비밀번호가 맞지 않습니다. 다시 입력해 주세요." };

  await grantGateAccess();
  redirect(next);
}
