import { NotFoundView } from "@/components/creators/state-views";

// 없는 공개 주소는 이 화면으로 온다(샘플 미리보기용. 실제 화면은 app/creators/not-found.tsx).
export default function CreatorNotFound() {
  return <NotFoundView title="찾을 수 없는 크리에이터예요" text="주소가 잘못되었거나, 공개한 기획안이 없는 크리에이터일 수 있어요." href="/dev-preview/creators" label="크리에이터 둘러보기" />;
}
