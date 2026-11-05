import { NotFoundView } from "@/components/creators/state-views";

// 없는 번호·UUID가 아닌 값·공개를 끈 기획안은 모두 이 화면으로 온다(샘플 미리보기용. 실제 화면은 app/portfolio/not-found.tsx).
export default function PlanNotFound() {
  return <NotFoundView title="찾을 수 없는 기획안이에요" text="주소가 잘못되었거나, 공개가 끝난 기획안일 수 있어요." href="/dev-preview/creators" label="크리에이터 둘러보기" />;
}
