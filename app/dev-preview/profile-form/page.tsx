import type { Metadata } from "next";
import Link from "next/link";
import "@/components/planner/planner.css";
import { ProfileFormPreview } from "./profile-form-preview";

// 디자인 확인용 샘플 미리보기. 기획안 화면의 「포트폴리오에 올리기」를 눌렀을 때 열리는 프로필 칸을 본다. 디자인이 끝나면 지운다.
export const metadata: Metadata = { title: "프로필 만들기 칸 샘플 미리보기", robots: { index: false, follow: false } };

const MODES = { planner: "기획안 올리다가", "planner-private": "기획안 올리다가(비공개 프로필 있음)", mypage: "마이페이지 처음 만들기", edit: "마이페이지 고치기", taken: "주소 중복(저장 시)", fail: "저장 실패" } as const;

export default async function ProfileFormPreviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.state) ? sp.state[0] : sp.state;
  const mode = (raw && raw in MODES ? raw : "planner") as keyof typeof MODES;
  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 max-w-[300px] rounded-lg border border-[#e8dfe3] bg-white/95 px-3 py-2 text-[11px] leading-snug text-[#2a2025] shadow-md">
        <strong>미리보기 도우미</strong> (사이트에 없는 상자)
        <br />
        가운데 흰 판은 기획안 화면 아래쪽 「포트폴리오」 칸을 흉내 낸 샘플이에요. 중복 확인 시험: <b>taken-name</b>(이미 쓰는 주소), <b>check-fail</b>(확인 실패), 샘플 크리에이터 주소(예: jian-lee).
        <br />
        보기:{" "}
        {Object.entries(MODES).map(([k, label], i) => (
          <span key={k}>
            {i > 0 && " · "}
            <Link href={`/dev-preview/profile-form?state=${k}`} className={k === mode ? "font-bold underline" : "underline"}>
              {label}
            </Link>
          </span>
        ))}
      </div>
      <ProfileFormPreview mode={mode} />
    </>
  );
}
