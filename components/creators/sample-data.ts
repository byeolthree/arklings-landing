// 디자인 확인용 샘플 데이터(/dev-preview/creators). 이름·글은 모두 가짜이며 실제 DB와 연결되지 않는다.
// 디자인 작업이 끝나 실제 읽기(lib/creators.ts)로 바꾸면 이 파일과 /dev-preview 주소는 지운다.
import { SLOT_LABELS } from "@/lib/plans";
import type { CreatorCard, CreatorProfileData, PlanCard, PlanDetailData } from "./types";

export const SAMPLE_CREATORS: CreatorCard[] = [
  { handle: "jian-lee", name: "이지안", roles: ["script"], bio: "사라지는 기억과 기록하는 사람을 쓰는 대본 작가예요.", planCount: 3, latest: { title: "소금비 내리는 나라", logline: "소금비가 내리는 날마다 한 사람의 기억이 사라지는 나라에서, 기억을 기록하는 서기가 왕의 기억만 지워지지 않는 이유를 쫓는다." } },
  { handle: "seoha-park", name: "박서하", roles: ["video", "producer"], bio: "밤에만 열리는 문 같은 이야기를 영상으로 옮겨요.", planCount: 2, latest: { title: "달빛 아래 두 번째 문", logline: "밤에만 열리는 문을 지키는 소녀가 문 너머에서 온 손님에게 이름을 빼앗길 위기에 처한다." } },
  { handle: "dayun-choi", name: "최다윤", roles: ["history_advisor"], bio: "옛 베 짜기와 복식을 이야기 속에 살려 내는 역사 자문가입니다.", planCount: 1, latest: { title: "실이 이어 준 사람들", logline: "베 짜는 마을의 여인들이 실 한 올로 먼 나라의 약속을 지켜 낸다." } },
  { handle: "hayun-jung", name: "정하윤", roles: ["script", "art_director"], bio: "붉은 강과 나루터처럼 장면이 먼저 떠오르는 글을 써요.", planCount: 5, latest: { title: "붉은 강이 흐르는 밤", logline: "해마다 강이 붉게 물드는 밤, 나루터지기가 마지막 배를 띄우기로 결심한다." } },
  { handle: "dohyun-kim", name: "김도현", roles: ["video"], bio: "짧은 영상으로 세계관의 첫인상을 만듭니다.", planCount: 4, latest: { title: "삼한의 마지막 등불", logline: "서로 다른 세 나라의 등불지기가 같은 불씨를 나눠 가지며 겨울을 난다." } },
  { handle: "seoyun-choi", name: "최서윤", roles: ["other"], bio: "지도에 없는 마을을 찾아다니는 사람.", planCount: 1, latest: { title: "지도에 없는 마을", logline: "지도를 그리던 청년이 지도에 없는 마을에서 자신이 그린 적 없는 지도를 발견한다." } },
  { handle: "minjun-han", name: "한민준", roles: ["script", "video", "art_director", "producer"], bio: "대본부터 영상, 제작 관리까지 한 편을 끝까지 같이 만들어요.", planCount: 7, latest: { title: "바람의 값", logline: "바람에도 값을 매기는 항구 도시에서, 값을 치르지 못한 선원들이 돌아갈 길을 찾는다." } },
  { handle: "yuna-oh", name: "오유나", roles: ["art_director"], planCount: 2, latest: { title: "짧은 글", logline: "한 줄 소개가 짧은 경우." } },
  { handle: "taeyang-baek", name: "백태양", roles: ["producer"], bio: "책임 프로듀서로 여러 팀의 일정을 맞춥니다.", planCount: 1, latest: { title: "아주 아주 긴 제목의 기획안이 카드 안에서 어떻게 잘리는지 확인하기 위한 샘플 제목입니다", logline: "한 줄 소개도 일부러 길게 적어서 카드 안의 글이 넘치지 않고 말줄임표로 잘리는지 확인합니다. 이 문장은 네 줄을 넘도록 계속 이어집니다. 줄바꿈과 말줄임이 같은 높이를 유지해야 합니다. 마지막 문장까지 모두 보이지는 않습니다." } },
  { handle: "sora-yoon", name: "윤소라", roles: ["video", "history_advisor"], bio: "물길과 뱃사공 이야기를 좋아하는 영상 크리에이터입니다.", planCount: 3, latest: { title: "나루터의 약속", logline: "물길이 바뀐 뒤에도 같은 자리에서 서로를 기다리는 두 뱃사공의 이야기." } },
  { handle: "junho-seo", name: "서준호", roles: ["script"], bio: "봉화대 같은 짧고 단단한 이야기를 씁니다.", planCount: 2, latest: { title: "마지막 봉화", logline: "봉화대를 지키는 병사가 어느 날 아무도 답하지 않는 불꽃을 올린다." } },
  { handle: "hana-kang", name: "강하나", roles: ["art_director", "other"], bio: "색이 사라지는 도읍 같은 장면의 색을 설계해요.", planCount: 6, latest: { title: "색을 잃은 도읍", logline: "색이 하나씩 사라지는 도읍에서 염색장이 마지막 색을 지킨다." } },
  { handle: "eunseo-jo", name: "조은서아라온다미리내", roles: ["script"], bio: "공개 이름이 길어도 소개 한 줄이 카드 밖으로 넘치지 않는지 확인하는 샘플 소개 문구입니다. 이 문장은 일부러 길게 적었습니다.", planCount: 1, latest: { title: "이름이 매우 긴 크리에이터", logline: "공개 이름이 길 때 이름 칸이 카드를 밀어내지 않고 말줄임표로 잘리는지 확인하는 샘플입니다." } },
  { handle: "gunwoo-lim", name: "임건우", roles: ["video", "script", "producer", "other"], bio: "여름이 끝나는 날의 쓸쓸함을 좋아해요.", planCount: 3, latest: { title: "여름이 끝나는 날", logline: "역할이 네 개일 때 「외 1」로 접히는지 확인하는 샘플입니다." } },
];

export const SAMPLE_PAGE_SIZE = 12;

export const SAMPLE_PROFILE_PAGE_SIZE = 9;

const PLAN_POOL: { title: string; logline: string }[] = [
  { title: "달빛 아래 두 번째 문", logline: "밤에만 열리는 문을 지키는 소녀가 문 너머에서 온 손님에게 이름을 빼앗길 위기에 처한다." },
  { title: "실이 이어 준 사람들", logline: "베 짜는 마을의 여인들이 실 한 올로 먼 나라의 약속을 지켜 낸다." },
  { title: "붉은 강이 흐르는 밤", logline: "해마다 강이 붉게 물드는 밤, 나루터지기가 마지막 배를 띄우기로 결심한다." },
  { title: "삼한의 마지막 등불", logline: "서로 다른 세 나라의 등불지기가 같은 불씨를 나눠 가지며 겨울을 난다." },
  { title: "지도에 없는 마을", logline: "지도를 그리던 청년이 지도에 없는 마을에서 자신이 그린 적 없는 지도를 발견한다." },
  { title: "바람의 값", logline: "바람에도 값을 매기는 항구 도시에서, 값을 치르지 못한 선원들이 돌아갈 길을 찾는다." },
  { title: "나루터의 약속", logline: "물길이 바뀐 뒤에도 같은 자리에서 서로를 기다리는 두 뱃사공의 이야기." },
  { title: "마지막 봉화", logline: "봉화대를 지키는 병사가 어느 날 아무도 답하지 않는 불꽃을 올린다." },
  { title: "색을 잃은 도읍", logline: "색이 하나씩 사라지는 도읍에서 염색장이 마지막 색을 지킨다." },
  { title: "여름이 끝나는 날", logline: "여름의 마지막 날에만 열리는 시장에서 잃어버린 계절을 되파는 상인을 만난다." },
  { title: "소금비 내리는 나라", logline: "소금비가 내리는 날마다 한 사람의 기억이 사라지는 나라에서, 기억을 기록하는 서기가 왕의 기억만 지워지지 않는 이유를 쫓는다." },
  { title: "짧은 글", logline: "한 줄 소개가 짧은 경우." },
];

// 한 크리에이터의 샘플 기획안 목록(최신 공개 순). 대표 기획안(latest)이 맨 위에 온다.
export function samplePlansOf(c: CreatorCard): PlanCard[] {
  const n = Math.max(c.planCount, 1);
  return Array.from({ length: n }, (_, i) => {
    const base = i === 0 ? c.latest : PLAN_POOL[(i * 5 + c.handle.length) % PLAN_POOL.length];
    const day = new Date(Date.UTC(2026, 9, 30 - i * 3, 3, 0, 0));
    return { id: `sample-${c.handle}-${i + 1}`, title: base.title, logline: base.logline, publishedAt: day.toISOString() };
  });
}

export function sampleProfileOf(c: CreatorCard): CreatorProfileData {
  return { handle: c.handle, name: c.name, roles: c.roles, bio: c.bio };
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
