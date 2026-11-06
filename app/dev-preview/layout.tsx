import { notFound } from "next/navigation";

// 디자인 확인용 샘플 화면은 실제 사이트(production)에서는 열리지 않는다. 미리보기 배포와 내 컴퓨터에서만 연다.
export default function DevPreviewLayout({ children }: { children: React.ReactNode }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  return children;
}
