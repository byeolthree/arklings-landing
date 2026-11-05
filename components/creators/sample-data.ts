// 디자인 확인용 샘플 데이터(/dev-preview/creators). 이름·글은 모두 가짜이며 실제 DB와 연결되지 않는다.
// 디자인 작업이 끝나 실제 읽기(lib/creators.ts)로 바꾸면 이 파일과 /dev-preview 주소는 지운다.
import { SLOT_LABELS } from "@/lib/plans";
import { GENRES } from "./genres";
import type { Role } from "@/lib/collab";
import { WORK_KINDS, type CreatorCard, type CreatorProfileData, type HeroKind, type PlanCard, type PlanDetailData, type WorkCard } from "./types";

// 목록·프로필 샘플이 받는 사람 값(협업 받는 중·전체 장르·분량은 작품에서 계산해 더한다)
type BaseCard = Omit<CreatorCard, "openToCollab" | "genres" | "forms" | "hero" | "main">;

const LOGLINES: Record<string, [string, string, string, string, string]> = {
  "소금비 내리는 나라": ["소금비가 내리는 날마다 한 사람의 기억이 사라지는 일", "기억을 기록하는 사관", "왕의 기억만 지워지지 않는 비밀", "사라진 기억의 복구", "나라 전체가 기억을 잃는 재앙"],
  "달빛 아래 두 번째 문": ["밤에만 열리는 문 너머에서 손님이 찾아오는 일", "문을 지키는 파수꾼", "이름을 빼앗으려는 손님의 계략", "자기 이름 지키기", "이름과 함께 존재가 지워지는 비극"],
  "실이 이어 준 사람들": ["먼 나라와의 약속이 위태로워지는 일", "베 짜는 마을의 여인들", "끊어지는 실처럼 흩어지는 마음", "실 한 올로 약속 지키기", "마을과 먼 나라의 인연이 끊기는 불행"],
  "붉은 강이 흐르는 밤": ["강이 붉게 물드는 밤이 찾아오는 일", "나루터를 지키는 늙은 뱃사공", "아무도 건너려 하지 않는 두려움", "마지막 배 띄우기", "나루터가 영영 사라지는 파국"],
  "삼한의 마지막 등불": ["혹독한 겨울이 세 나라를 덮치는 일", "세 나라의 등불지기들", "서로를 믿지 못하는 적대감", "하나의 불씨 나눠 겨울나기", "모든 등불이 꺼지는 암흑"],
  "지도에 없는 마을": ["지도에 없는 마을을 발견하는 일", "지도를 그리던 청년", "그린 적 없는 지도 속 낯선 선들", "마을의 비밀 밝히기", "자신이 지도 속으로 지워지는 운명"],
  "바람의 값": ["바람에 값을 매기는 항구에 선원들이 발이 묶이는 일", "값을 치르지 못한 선원들", "바람을 쥔 상인들의 독점", "고향으로 돌아가는 길 찾기", "영영 항구에 갇히는 운명"],
  "짧은 글": ["큰 일", "청년", "두려움", "용기", "큰 위험"],
  "나루터의 약속": ["물길이 바뀌어 나루터가 사라지는 일", "두 뱃사공", "서로 다른 쪽으로 갈라진 물길", "같은 자리에서 다시 만나기", "서로를 영영 잃는 이별"],
  "마지막 봉화": ["아무도 답하지 않는 봉화가 올라오는 일", "봉화대를 지키는 병졸", "끝내 응답이 없는 침묵", "불꽃의 주인 찾기", "변방이 무너지는 참변"],
  "색을 잃은 도읍": ["도읍의 색이 하나씩 사라지는 일", "늙은 염색 장인", "모든 색을 삼키는 잿빛 기운", "마지막 색 지키기", "도읍이 영영 빛을 잃는 종말"],
  "이름이 매우 긴 크리에이터": ["공개 이름이 길어 카드를 밀어내는 일", "이름이 긴 서기관", "말줄임 없이 넘치는 글줄", "카드 안에 이름 담기", "화면이 깨지는 혼란"],
  "여름이 끝나는 날": ["여름의 마지막 날에 시장이 열리는 일", "계절을 잃은 청년", "되팔리는 계절의 값", "잃어버린 여름 되찾기", "영영 계절이 멈추는 재앙"],
  "아주 아주 긴 제목의 기획안이 카드 안에서 어떻게 잘리는지 확인하기 위한 샘플 제목입니다": ["여러 팀의 일정이 한꺼번에 겹치고 연락이 끊기며 모든 계획이 흔들리기 시작하는 일", "책임을 맡아 모든 팀의 일정을 맞추는 사람", "서로 다른 팀들이 각자 주장하는 어긋난 일정과 끝없는 변경 요구와 쌓여 가는 불신", "모든 팀이 같은 날 같은 장소에서 만나 끝까지 한 편을 완성하기", "몇 달 동안 쌓은 작업이 모두 헛되이 사라지는 참담함"],
};

// 로그라인은 기획안 화면의 문장 틀(lib/plans.ts의 buildSuggestion 새 틀, 3-14)대로만 만든다: 어느 날 〈사건〉이 벌어지자, 〈주인공〉은 〈장애물〉을 극복해야 〈목표〉를 달성할 수 있다. 그렇지 않으면 〈위험〉이 닥친다.
// 조사는 틀 그대로(이·은·을·를·이)라 칸 글의 끝소리를 맞췄다(사건·주인공·장애물·위험은 받침으로, 목표는 받침 없이 끝난다).
const loglineOf = (title: string): string => {
  const [사건, 주인공, 장애물, 목표, 위험] = LOGLINES[title];
  return `어느 날 ${사건}이 벌어지자, ${주인공}은 ${장애물}을 극복해야 ${목표}를 달성할 수 있다. 그렇지 않으면 ${위험}이 닥친다.`;
};

const RAW_CREATORS: BaseCard[] = [
  { handle: "jian-lee", name: "별뜨리", roles: ["script"], bio: "사라지는 기억과 기록하는 사람을 쓰는 대본 작가예요.", planCount: 3, latest: { title: "소금비 내리는 나라", logline: loglineOf("소금비 내리는 나라"), genres: ["드라마", "판타지"] } },
  { handle: "seoha-park", name: "하삘라", roles: ["video", "producer"], bio: "밤에만 열리는 문 같은 이야기를 영상으로 옮겨요.", planCount: 2, latest: { title: "달빛 아래 두 번째 문", logline: loglineOf("달빛 아래 두 번째 문"), genres: ["판타지", "미스터리"] } },
  { handle: "dayun-choi", name: "morningstar", roles: ["history_advisor"], bio: "옛 베 짜기와 복식을 이야기 속에 살려 내는 역사 자문가입니다.", planCount: 1, latest: { title: "실이 이어 준 사람들", logline: loglineOf("실이 이어 준 사람들"), genres: ["드라마"] } },
  { handle: "hayun-jung", name: "정하윤", roles: ["script", "art_director"], bio: "붉은 강과 나루터처럼 장면이 먼저 떠오르는 글을 써요.", planCount: 5, latest: { title: "붉은 강이 흐르는 밤", logline: loglineOf("붉은 강이 흐르는 밤"), genres: ["드라마", "로맨스"] } },
  { handle: "dohyun-kim", name: "김도현", roles: ["video"], bio: "짧은 영상으로 세계관의 첫인상을 만듭니다.", planCount: 4, latest: { title: "삼한의 마지막 등불", logline: loglineOf("삼한의 마지막 등불"), genres: ["전쟁", "드라마"] } },
  { handle: "seoyun-choi", name: "최서윤", roles: ["other"], bio: "지도에 없는 마을을 찾아다니는 사람.", planCount: 1, latest: { title: "지도에 없는 마을", logline: loglineOf("지도에 없는 마을"), genres: ["미스터리"] } },
  { handle: "minjun-han", name: "한민준", roles: ["script", "video", "art_director", "producer"], bio: "대본부터 영상, 제작 관리까지 한 편을 끝까지 같이 만들어요.", planCount: 7, latest: { title: "바람의 값", logline: loglineOf("바람의 값"), genres: ["액션", "스릴러", "범죄"] } },
  { handle: "yuna-oh", name: "오유나", roles: ["art_director"], planCount: 2, latest: { title: "짧은 글", logline: loglineOf("짧은 글"), genres: ["애니메이션"] } },
  { handle: "taeyang-baek", name: "백태양", roles: ["producer"], bio: "책임 프로듀서로 여러 팀의 일정을 맞춥니다.", planCount: 1, latest: { title: "아주 아주 긴 제목의 기획안이 카드 안에서 어떻게 잘리는지 확인하기 위한 샘플 제목입니다", logline: loglineOf("아주 아주 긴 제목의 기획안이 카드 안에서 어떻게 잘리는지 확인하기 위한 샘플 제목입니다"), genres: ["다큐멘터리"] } },
  { handle: "sora-yoon", name: "윤소라", roles: ["video", "history_advisor"], bio: "물길과 뱃사공 이야기를 좋아하는 영상 크리에이터입니다.", planCount: 3, latest: { title: "나루터의 약속", logline: loglineOf("나루터의 약속"), genres: ["드라마", "로맨스"] } },
  { handle: "junho-seo", name: "서준호", roles: ["script"], bio: "봉화대 같은 짧고 단단한 이야기를 씁니다.", planCount: 2, latest: { title: "마지막 봉화", logline: loglineOf("마지막 봉화"), genres: ["전쟁", "액션"] } },
  { handle: "hana-kang", name: "강하나", roles: ["art_director", "other"], bio: "색이 사라지는 도읍 같은 장면의 색을 설계해요.", planCount: 6, latest: { title: "색을 잃은 도읍", logline: loglineOf("색을 잃은 도읍"), genres: ["판타지", "애니메이션"] } },
  { handle: "eunseo-jo", name: "조은서아라온다미리내", roles: ["script"], bio: "공개 이름이 길어도 소개 한 줄이 카드 밖으로 넘치지 않는지 확인하는 샘플 소개 문구입니다. 이 문장은 일부러 길게 적었습니다.", planCount: 1, latest: { title: "이름이 매우 긴 크리에이터", logline: loglineOf("이름이 매우 긴 크리에이터"), genres: ["드라마", "미스터리"] } },
  { handle: "gunwoo-lim", name: "임건우", roles: ["video", "script", "producer", "other"], bio: "여름이 끝나는 날의 쓸쓸함을 좋아해요.", planCount: 3, latest: { title: "여름이 끝나는 날", logline: loglineOf("여름이 끝나는 날"), genres: ["로맨스", "코미디"] } },
];

export const SAMPLE_PAGE_SIZE = 12;

export const SAMPLE_PROFILE_PAGE_SIZE = 9;

const PLAN_POOL: { title: string; logline: string }[] = [
  { title: "달빛 아래 두 번째 문", logline: loglineOf("달빛 아래 두 번째 문") },
  { title: "실이 이어 준 사람들", logline: loglineOf("실이 이어 준 사람들") },
  { title: "붉은 강이 흐르는 밤", logline: loglineOf("붉은 강이 흐르는 밤") },
  { title: "삼한의 마지막 등불", logline: loglineOf("삼한의 마지막 등불") },
  { title: "지도에 없는 마을", logline: loglineOf("지도에 없는 마을") },
  { title: "바람의 값", logline: loglineOf("바람의 값") },
  { title: "나루터의 약속", logline: loglineOf("나루터의 약속") },
  { title: "마지막 봉화", logline: loglineOf("마지막 봉화") },
  { title: "색을 잃은 도읍", logline: loglineOf("색을 잃은 도읍") },
  { title: "여름이 끝나는 날", logline: loglineOf("여름이 끝나는 날") },
  { title: "소금비 내리는 나라", logline: loglineOf("소금비 내리는 나라") },
  { title: "짧은 글", logline: loglineOf("짧은 글") },
];

// 한 크리에이터의 샘플 기획안 목록(최신 공개 순). 대표 기획안(latest)이 맨 위에 온다.
export function samplePlansOf(c: Pick<BaseCard, "handle" | "planCount" | "latest">): PlanCard[] {
  const n = Math.max(c.planCount, 1);
  return Array.from({ length: n }, (_, i) => {
    const base = i === 0 ? c.latest : PLAN_POOL[(i * 5 + c.handle.length) % PLAN_POOL.length];
    const day = new Date(Date.UTC(2026, 9, 30 - i * 3, 3, 0, 0));
    return { id: `sample-${c.handle}-${i + 1}`, title: base.title, logline: base.logline, publishedAt: day.toISOString() };
  });
}

// 소개 글·채널 링크·협업 신청 받는 중은 샘플 몇 사람에게만 더해 둔다(없는 사람은 그 칸이 안 보인다).
const SAMPLE_EXTRA: Record<string, { about?: string; channels?: { label: string; url: string }[]; openToCollab?: boolean }> = {
  "jian-lee": { about: "경력 5년차 대본 작가예요.\n드라마와 판타지를 오가며 이야기를 씁니다.\n하고 싶은 협업: 영상으로 옮길 짧은 이야기.", channels: [{ label: "인스타그램", url: "https://example.com/instagram" }, { label: "유튜브", url: "https://example.com/youtube" }], openToCollab: true },
  "seoha-park": { channels: [{ label: "유튜브", url: "https://example.com/youtube" }], openToCollab: true },
  "dayun-choi": { openToCollab: false },
  "hayun-jung": { channels: [{ label: "블로그", url: "https://example.com/blog" }], openToCollab: true },
};

// 샘플의 대표 이미지·영상: 영상 제작은 영상, 그 밖은 이미지. 대표를 안 올린 사람도 둔다(역사 자문·책임 프로듀서 일부).
const NO_HERO = new Set(["taeyang-baek"]);
// 맨 위 세 크리에이터는 대표 영상을 한 개씩 건다(샘플 영상 파일은 public/dev-preview, git에는 올리지 않음).
const HERO_VIDEO: Record<string, string> = {
  "jian-lee": "/dev-preview/hero-chantalbam.mp4", // 별뜨리: 찬탈밤
  "seoha-park": "/dev-preview/hero-demo.mp4", // 하삘라: 황룡사
  "dayun-choi": "/dev-preview/hero-execution.mp4", // morningstar: 처형장
};
const heroOf = (c: { handle: string; roles: Role[] }): HeroKind | undefined => (NO_HERO.has(c.handle) ? undefined : HERO_VIDEO[c.handle] || c.roles[0] === "video" ? "video" : "image");

export function sampleProfileOf(c: BaseCard): CreatorProfileData {
  const x = SAMPLE_EXTRA[c.handle];
  return { handle: c.handle, name: c.name, roles: c.roles, bio: x?.about ?? c.bio, channels: x?.channels, openToCollab: x?.openToCollab ?? true, hero: heroOf(c), heroSrc: HERO_VIDEO[c.handle] };
}

// 프로필의 작품 카드(최신 공개 순). 장르는 대표 작품이 가진 것을 쓰고, 나머지는 돌려 가며 붙인 샘플이다.
export function sampleWorksOf(c: BaseCard, count = c.planCount): WorkCard[] {
  return samplePlansOf({ ...c, planCount: count }).map((p, i) => {
    const h = c.handle.length;
    const genres = i === 0 && c.latest.genres ? c.latest.genres : [GENRES[(i * 3 + h) % GENRES.length], GENRES[(i * 5 + h + 1) % GENRES.length]].filter((g, k, a) => a.indexOf(g) === k);
    return { id: p.id, title: p.title, logline: p.logline, roles: c.roles.slice(0, 2), genres, kind: WORK_KINDS[(i * 3 + h) % WORK_KINDS.length], form: (i + h) % 3 === 1 ? "short" : "long", publishedAt: p.publishedAt };
  });
}

const SAMPLE_ANSWERS = [
  "해마다 첫눈이 오는 밤, 마을의 우물이 거꾸로 차오른다.",
  "우물 곁을 지키는 열네 살 물지기 소녀.",
  "마을 사람들은 우물이 거꾸로 차오르는 일을 입에 올리지 못한다.",
  "차오른 물이 마을을 덮기 전에 우물의 처음 주인을 찾는다.",
  "처음 주인을 찾으면 마을에서 가장 오래된 약속이 깨진다.",
];

// 샘플 기획안 번호(sample-<공개주소>-<순번>)로 상세 화면 값을 만든다. 없는 번호는 null.
export function sampleDetailOf(id: string): PlanDetailData | null {
  const m = /^sample-(.+)-(\d+)$/.exec(id);
  if (!m) return null;
  const creator = SAMPLE_CREATORS.find((c) => c.handle === m[1]);
  if (!creator) return null;
  const plan = samplePlansOf(creator).find((p) => p.id === id);
  if (!plan) return null;
  return {
    id,
    title: plan.title,
    authorName: creator.name,
    authorHandle: creator.handle,
    authorRoles: creator.roles,
    publishedAt: plan.publishedAt,
    content: {
      sections: [{ id: "logline", label: "로그라인", text: plan.logline }],
      answers: SLOT_LABELS.map((label, k) => ({ label, text: SAMPLE_ANSWERS[k] })),
    },
  };
}

// 목록 카드 샘플: 협업 받는 중은 프로필과 같은 값, 장르·분량은 그 사람의 작품 카드에서 모은다.
export const SAMPLE_CREATORS: CreatorCard[] = RAW_CREATORS.map((c) => {
  const works = sampleWorksOf(c);
  const hero = heroOf(c);
  // 대표 영상이 있는 사람과 아트디렉터·영상 제작은 로그라인 대신 대표 이미지·영상을 메인에 건다.
  const main = hero && (HERO_VIDEO[c.handle] || c.roles[0] === "video" || c.roles[0] === "art_director") ? "media" : "logline";
  return { ...c, hero, heroSrc: HERO_VIDEO[c.handle], main, openToCollab: sampleProfileOf(c).openToCollab ?? true, genres: [...new Set(works.flatMap((w) => w.genres))], forms: [...new Set(works.map((w) => w.form))] };
});
