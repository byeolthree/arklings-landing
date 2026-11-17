import { getCurrentUser } from "@/lib/auth";
import { MEASURE_ENABLED } from "@/lib/measure/config";
import { MeasureIdentityClient } from "@/lib/measure/client-parts";

// 로그인한 사람의 내부 번호(user id)와 가입 방식을 Amplitude 사용자 속성으로 넘기는 서버 부품. app/layout.tsx가 그린다.
// 이메일·이름은 넘기지 않는다. 서버 전용(next/headers)이라 lib/measure/server.ts로만 내보낸다.
export async function MeasureIdentity() {
  if (!MEASURE_ENABLED) return null;
  const user = await getCurrentUser();
  const method = user?.providers[0];
  return <MeasureIdentityClient userId={user?.id ?? null} method={method === "email" || method === "google" || method === "kakao" ? method : null} />;
}
