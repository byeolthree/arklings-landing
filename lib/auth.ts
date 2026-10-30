import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export type CurrentUser = {
  id: string;
  email: string | null;
  // 이메일 소유가 확인됐는지(확인 메일 링크를 눌렀거나, 구글처럼 확인된 이메일을 준 경우)
  emailConfirmed: boolean;
  providers: string[];
};

// 지금 로그인한 사람. 로그인하지 않았거나 연결 설정이 없으면 null.
// getUser()는 Supabase 서버가 직접 확인해 주므로, 쿠키만 믿지 않고 안전하다.
// 같은 요청 안에서 여러 번 불러도 Supabase에는 한 번만 물어본다(cache).
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
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
    return { id: data.user.id, email: data.user.email ?? null, emailConfirmed: Boolean(data.user.email_confirmed_at), providers };
  } catch {
    return null;
  }
});

// 로그인이 필요한 화면의 맨 위에서 부른다. 로그인 전이면 로그인 화면으로 보내고, 끝나면 이 화면으로 돌아온다.
export async function requireUser(returnPath: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext(returnPath))}`);
  // 카카오처럼 이메일 없이 들어온 계정은 이메일 확인을 마칠 때까지 다른 화면을 쓸 수 없다.
  if (!user.email || !user.emailConfirmed) redirect(`/auth/add-email?next=${encodeURIComponent(safeNext(returnPath))}`);
  return user;
}
