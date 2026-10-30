// 포트폴리오(공개된 기획안) 읽기. 목록·상세 화면은 이 파일의 함수만 부른다.
// 화면으로 넘기는 값에는 주인 번호·이메일을 싣지 않는다(작성자는 공개 이름만).
// 1단계: 샘플 데이터(lib/portfolio-sample.ts)로 동작한다. 2단계에서 아래 두 함수의 속만 DB 읽기로 바꾼다.
import type { PublicContent } from "@/lib/plans";
import { SAMPLE_ROWS } from "@/lib/portfolio-sample";

export const PORTFOLIO_PAGE_SIZE = 10;

export type PortfolioCard = {
  id: string; // 기획안 고유번호(UUID). 주소에 쓰는 유일한 번호다.
  title: string;
  logline: string;
  authorName: string;
  publishedAt: string; // 처음 게시한 시각(ISO). 공개를 껐다 켜도 바뀌지 않는다.
};

export type PortfolioDetail = PortfolioCard & { content: PublicContent };

const loglineOf = (c: PublicContent) => c.sections.find((s) => s.id === "logline")?.text ?? "";

// 처음 게시한 순서(최근 것 먼저)로 page쪽(1부터)의 10개와 전체 개수를 돌려준다.
export async function listPortfolio(page: number): Promise<{ cards: PortfolioCard[]; total: number }> {
  const rows = SAMPLE_ROWS.filter((r) => r.isPublic).sort((a, b) => b.firstPublishedAt.localeCompare(a.firstPublishedAt));
  const from = (page - 1) * PORTFOLIO_PAGE_SIZE;
  const cards = rows.slice(from, from + PORTFOLIO_PAGE_SIZE).map((r) => ({
    id: r.id,
    title: r.title,
    logline: loglineOf(r.content),
    authorName: r.authorName,
    publishedAt: r.firstPublishedAt,
  }));
  return { cards, total: rows.length };
}

// 공개된 기획안 하나. 없거나 공개하지 않은 것은 null(화면은 404로 보여 준다).
export async function getPortfolio(id: string): Promise<PortfolioDetail | null> {
  const r = SAMPLE_ROWS.find((x) => x.id === id && x.isPublic);
  if (!r) return null;
  return { id: r.id, title: r.title, logline: loglineOf(r.content), authorName: r.authorName, publishedAt: r.firstPublishedAt, content: r.content };
}
