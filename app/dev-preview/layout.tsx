import { notFound } from "next/navigation";

// 디자인 확인용 샘플 화면은 실제 사이트(production)에서는 열리지 않는다. 미리보기 배포와 내 컴퓨터에서만 연다.
export default function DevPreviewLayout({ children }: { children: React.ReactNode }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  return (
    <>
      <p role="note" style={{ position: "fixed", top: 76, left: 8, zIndex: 60, margin: 0, padding: "2px 10px", borderRadius: 999, background: "#2a2025", color: "#fff", fontSize: 11 }}>
        샘플 화면 · 저장되지 않음
      </p>
      {children}
    </>
  );
}
