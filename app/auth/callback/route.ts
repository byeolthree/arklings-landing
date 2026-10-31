import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { CONSENT_VERSION } from "@/lib/consent";
import { safeNext } from "@/lib/safe-next";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";

// 구글·카카오 로그인이 끝나고 돌아오는 곳.
// 실패·취소는 막다른 오류가 아니라 다음에 할 일이 있는 안내 화면(/auth/social-failed)으로 보낸다.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  const failed = (reason: string) => `/auth/social-failed?reason=${reason}&next=${encodeURIComponent(next)}`;

  const providerError = params.get("error_code") ?? params.get("error");
  if (providerError) {
    if (providerError === "access_denied") redirect(failed("cancelled"));
    if (providerError === "identity_already_exists") redirect(failed("linked_elsewhere"));
    redirect(failed("failed"));
  }

  const code = params.get("code");
  if (!code) redirect(failed("failed"));

  const cookieStore = await cookies();
  let destination = next;
  let problem: string | null = null;
  try {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      problem = error.code === "identity_already_exists" ? "linked_elsewhere" : "expired";
    } else {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (user) {
        // 소셜 버튼을 누르기 전에 동의한 문구 버전을 기록한다(이미 있으면 그대로 둔다).
        const consent = cookieStore.get("arklings_consent")?.value;
        if (consent === CONSENT_VERSION) {
          await createAdminClient()
            .from("profile_consents")
            .upsert({ user_id: user.id, consent_version: consent }, { onConflict: "user_id", ignoreDuplicates: true });
        }
        // 카카오처럼 이메일 없이 들어왔으면 이메일을 입력받아 확인하는 화면으로 먼저 보낸다.
        if (!user.email || !user.email_confirmed_at) destination = `/auth/add-email?next=${encodeURIComponent(next)}`;
      }
    }
  } catch {
    problem = "failed";
  }
  cookieStore.delete({ name: "arklings_consent", path: "/auth" });
  if (problem) redirect(failed(problem));
  redirect(destination);
}
