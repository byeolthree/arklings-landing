import { requireUser } from "@/lib/auth";

// 이 묶음에 화면이 더해져도 기본으로 로그인 확인이 걸리게 하는 안전장치다.
// 화면 자체(page.tsx)와 수정·삭제 동작에서도 각각 다시 확인한다.
export default async function CollabListLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/collab");
  return children;
}
