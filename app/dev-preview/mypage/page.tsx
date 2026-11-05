import type { Metadata } from "next";
import Link from "next/link";
import "@/components/planner/planner.css";
import "@/components/mypage/mypage.css";
import { MypagePreview, type ProfileState } from "@/components/mypage/mypage-preview";

// 디자인 확인용 샘플 미리보기. 실제 로그인·DB와 연결되지 않고, 디자인이 끝나면 지운다.
export const metadata: Metadata = { title: "마이페이지 샘플 미리보기", robots: { index: false, follow: false } };

const PROFILES = { none: "프로필 없음", public: "프로필 있음(공개 중)", private: "프로필 있음(비공개)" } as const;
const MSGS = { linked: "연결 성공", link_failed: "연결 실패" } as const;

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MypagePreviewPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const rawProfile = one(sp.profile);
  const profile = (rawProfile && rawProfile in PROFILES ? rawProfile : "public") as ProfileState;
  const rawMsg = one(sp.msg);
  const msg = rawMsg && rawMsg in MSGS ? rawMsg : undefined;
  const pending = one(sp.pending) === "1";

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { profile, msg, pending: pending ? "1" : undefined, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const s = p.toString();
    return `/dev-preview/mypage${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <details className="fixed bottom-4 right-4 z-50 max-w-[300px] rounded-lg border border-[#e8dfe3] bg-white/95 px-3 py-2 text-[11px] leading-snug text-[#2a2025] shadow-md">
        <summary className="cursor-pointer">
          <strong>미리보기 도우미</strong> (사이트에 없는 상자, 눌러서 펼침)
        </summary>
        <div className="mt-1">
          가짜 데이터예요. 「펼쳐서 꾸미기」는 10단계에서 만들어요. 공개 주소 중복 확인 시험: <b>taken-name</b>, <b>check-fail</b>.
          <br />
          프로필:{" "}
          {Object.entries(PROFILES).map(([k, label], i) => (
            <span key={k}>
              {i > 0 && " · "}
              <Link href={href({ profile: k })} className={k === profile ? "font-bold underline" : "underline"}>
                {label}
              </Link>
            </span>
          ))}
          <br />
          로그인 결과 안내:{" "}
          <Link href={href({ msg: undefined })} className={!msg ? "font-bold underline" : "underline"}>
            없음
          </Link>
          {Object.entries(MSGS).map(([k, label]) => (
            <span key={k}>
              {" · "}
              <Link href={href({ msg: k })} className={k === msg ? "font-bold underline" : "underline"}>
                {label}
              </Link>
            </span>
          ))}
          <br />
          저장 뒤 올라갈 작품:{" "}
          <Link href={href({ pending: pending ? undefined : "1" })} className="underline">
            {pending ? "끄기" : "보이기"}
          </Link>
        </div>
      </details>
      <MypagePreview key={`${profile}-${msg}-${pending}`} profile={profile} msg={msg} pending={pending} />
    </>
  );
}
