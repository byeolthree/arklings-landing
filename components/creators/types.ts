import type { Role } from "@/lib/collab";

// 크리에이터 목록 카드 한 장에 필요한 값. 실제 읽기(lib/creators.ts)가 생기면 그 결과가 이 모양을 따른다.
// 주인 번호(UUID)는 어디에도 싣지 않는다. 주소에는 공개 주소(handle)만 쓴다.
export type CreatorCard = {
  handle: string;
  name: string; // 공개 이름
  roles: Role[];
  planCount: number; // 공개한 기획안 수(1 이상인 사람만 목록에 나온다)
  latest: { title: string; logline: string }; // 가장 최근에 공개한 기획안
};
