import type { Metadata } from "next";
import Link from "next/link";
import { LibraryPreview, type Next } from "./preview";

// 디자인 확인용 샘플 미리보기(라이브러리 질의응답). 서버·AI·DB를 부르지 않는다. 상단 메뉴·랜딩에는 잇지 않았다. 디자인이 끝나면 지운다.
export const metadata: Metadata = { title: "라이브러리 질의응답 샘플 미리보기", robots: { index: false, follow: false } };

const NEXT: Record<Next, string> = { normal: "정상 답", nomatch: "자료에 없음", cutoff: "답이 끊김", limit: "횟수 소진", busy: "요청 몰림", auth: "AI 연결 문제", retry: "일시 오류", input: "입력 오류" };
const START: Record<string, string> = { none: "빈 대화", waiting: "기다리는 중", streaming: "작성 중", done: "답 완료", nomatch: "자료 없음", cutoff: "끊김" };
type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function LibraryPreviewPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const login = one(sp.login) !== "out";
  const wiki = one(sp.wiki) === "empty" ? "empty" : "filled";
  const next = (one(sp.next) && one(sp.next)! in NEXT ? one(sp.next) : "normal") as Next;
  const start = one(sp.start) && one(sp.start)! in START ? one(sp.start)! : "none";
  const href = (o: Record<string, string>) => `/dev-preview/library?${new URLSearchParams({ login: login ? "in" : "out", wiki, next, start, ...o })}`;
  const line = (label: string, key: string, cur: string, map: Record<string, string>) => (
    <span className="block">
      {label}:{" "}
      {Object.entries(map).map(([k, v], i) => (
        <span key={k}>
          {i > 0 && " · "}
          <Link href={href({ [key]: k })} className={k === cur ? "font-bold underline" : "underline"}>
            {v}
          </Link>
        </span>
      ))}
    </span>
  );
  return (
    <>
      <details className="mx-auto mt-6 w-full max-w-[880px] px-4 text-[11px] leading-snug text-[#2a2025]">
        <summary className="cursor-pointer">미리보기 도우미 (사이트에 없는 상자) — 상태 고르기</summary>
        <p className="mt-2 rounded-lg border border-[#e8dfe3] bg-white px-3 py-2">
          {line("로그인", "login", login ? "in" : "out", { in: "한 상태", out: "안 한 상태" })}
          {line("위키", "wiki", wiki, { filled: "채움", empty: "비었음" })}
          {line("다음 질문의 결과", "next", next, NEXT)}
          {line("처음 모습", "start", start, START)}
        </p>
      </details>
      <LibraryPreview key={`${login}-${wiki}-${next}-${start}`} loggedIn={login} wikiEmpty={wiki === "empty"} next={next} start={start} />
    </>
  );
}
