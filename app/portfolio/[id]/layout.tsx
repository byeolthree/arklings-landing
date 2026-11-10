import { notFound } from "next/navigation";
import { load } from "./load";

// 없는 작품·공개를 끈 작품·지워진 작품(남의 비공개 작품 포함)은 응답을 보내기 전에 여기서 못 찾음으로 보낸다. 그래야 응답 코드가 진짜 404가 된다.
// (page.tsx 안에서 notFound()를 부르면, 불러오는 중 화면(loading.tsx)이 먼저 나가면서 코드가 200으로 정해진 뒤라 바꿀 수 없다.) 화면 모양은 app/portfolio/not-found.tsx 그대로다.
export default async function WorkLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  if (!(await load((await params).id))) notFound();
  return children;
}
