import type { Metadata } from "next";
import { PlannerEditor } from "@/components/planner/planner-editor";

export const metadata: Metadata = { title: "기획안 (로그아웃으로 열린 상태 시험)" };
export const dynamic = "force-dynamic";

// 시험용: 화면은 「로그아웃으로 알고」 열리지만(loggedIn=false), 서버 동작은 지금 브라우저의 실제 로그인 세션으로 처리된다.
// 「화면을 연 뒤에 다른 창에서 로그인한 경우」를 비밀번호 입력 없이 다시 만들어 보는 자리다. 실제 사이트(production)에서는 layout이 404로 막는다.
export default function PlannerStalePage() {
  return <PlannerEditor loggedIn={false} displayName="" panel={null} />;
}
