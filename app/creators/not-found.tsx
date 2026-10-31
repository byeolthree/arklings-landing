import { NotFoundView } from "@/components/creators/state-views";

// 없는 공개 주소, 형식이 틀린 주소, 공개한 기획안이 없는 크리에이터가 모두 이 화면으로 온다.
export default function CreatorNotFound() {
  return <NotFoundView title="찾을 수 없는 크리에이터예요" text="주소가 잘못되었거나, 공개한 기획안이 없는 크리에이터일 수 있어요." href="/creators" label="크리에이터 둘러보기" />;
}
