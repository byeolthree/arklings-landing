import { notFound } from "next/navigation";
import { load } from "./load";

// 없는 공개 주소, 형식이 틀린 주소, 남의 비공개 프로필은 응답을 보내기 전에 여기서 못 찾음으로 보낸다. 그래야 응답 코드가 진짜 404가 된다.
// (page.tsx 안에서 notFound()를 부르면, 불러오는 중 화면(loading.tsx)이 먼저 나가면서 코드가 200으로 정해진 뒤라 바꿀 수 없다.) 화면 모양은 app/creators/not-found.tsx 그대로다.
export default async function CreatorLayout({ children, params }: { children: React.ReactNode; params: Promise<{ handle: string }> }) {
  if (!(await load((await params).handle))) notFound();
  return children;
}
