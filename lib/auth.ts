import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export type CurrentUser = {
  id: string;
  email: string | null;
  providers: string[];
};

// 지금 로그인한 사람. 로그인하지 않았거나 연결 설정이 없으면 null.
// getUser()는 Supabase 서버가 직접 확인해 주므로, 쿠키만 믿지 않고 안전하다.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // 쿠키 읽기는 try 밖에서 먼저 한다. 그래야 이 함수를 쓰는 화면이 "요청 때마다 그리는 화면"으로 처리되고,
  // 로그인한 사람에게 빌드 때 굳어 버린 로그아웃 헤더가 보이지 않는다.
  await cookies();
  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const providers = Array.from(
      new Set((data.user.identities ?? []).map((i) => i.provider).concat(data.user.app_metadata?.provider ?? [])),
    ).filter(Boolean) as string[];
    return { id: data.user.id, email: data.user.email ?? null, providers };
  } catch {
    return null;
  }
}

// 로그인이 필요한 화면의 맨 위에서 부른다. 로그인 전이면 로그인 화면으로 보내고, 끝나면 이 화면으로 돌아온다.
export async function requireUser(returnPath: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext(returnPath))}`);
  return user;
}
