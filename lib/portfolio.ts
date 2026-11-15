// 포트폴리오(공개된 기획안) 읽기. 기획안으로 들어온 협업 신청 화면(/collab/new?plan=)이 이 파일의 함수만 부른다.
// DB의 portfolio_items 보기(view, 0007)에서만 읽는다. 이 보기에는 공개된 기획안의 제목·처음 공개한 시각·공개 이름·공개용 사본만 있고,
// 주인 번호·이메일·임시저장 이력은 없다. 화면으로 넘기는 값에도 싣지 않는다.
import type { PublicContent } from "@/lib/plans";
import { getSupabase } from "@/lib/supabase";
import { isObj } from "@/lib/utils";

export type PortfolioCard = {
  id: string; // 기획안 고유번호(UUID). 주소에 쓰는 유일한 번호다.
  title: string;
  logline: string;
  authorName: string; // 공개 이름(profiles.display_name). 읽을 때마다 새로 가져오므로 이름을 바꾸면 바로 반영된다.
  publishedAt: string; // 처음 공개한 시각(ISO). 공개를 껐다 켜도 바뀌지 않는다.
};

export type PortfolioDetail = PortfolioCard & { content: PublicContent };

type Row = { id: string; title: string; published_at: string; author_name: string; public_content: unknown };
const COLUMNS = "id, title, published_at, author_name, public_content";

const isStr = (v: unknown): v is string => typeof v === "string";

// DB의 공개용 사본(jsonb)을 화면에 쓰기 전에 모양을 다시 확인한다. 이상하면 null.
export function parsePublicContent(v: unknown): PublicContent | null {
  if (!isObj(v) || !Array.isArray(v.sections) || !Array.isArray(v.answers)) return null;
  const sections: PublicContent["sections"] = [];
  for (const s of v.sections) {
    if (!isObj(s) || s.id !== "logline" || !isStr(s.label) || !isStr(s.text)) return null;
    sections.push({ id: "logline", label: s.label, text: s.text });
  }
  const answers: PublicContent["answers"] = [];
  for (const a of v.answers) {
    if (!isObj(a) || !isStr(a.label) || !isStr(a.text)) return null;
    answers.push({ label: a.label, text: a.text });
  }
  return { sections, answers };
}

const loglineOf = (c: PublicContent | null) => c?.sections.find((s) => s.id === "logline")?.text ?? "";

const toCard = (r: Row): PortfolioCard => ({
  id: r.id,
  title: r.title,
  logline: loglineOf(parsePublicContent(r.public_content)),
  authorName: r.author_name,
  publishedAt: r.published_at,
});

// 공개된 기획안 하나. 없거나 공개를 껐거나 지워졌으면 null(화면은 404로 보여 준다).
export async function getPortfolio(id: string): Promise<PortfolioDetail | null> {
  const { data, error } = await getSupabase().from("portfolio_items").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Row;
  const content = parsePublicContent(row.public_content);
  if (!content) return null; // 깨진 기록은 화면에 싣지 않는다
  return { ...toCard(row), content };
}
