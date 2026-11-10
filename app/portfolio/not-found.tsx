import { NotFoundView } from "@/components/creators/state-views";

// 없는 주소, 공개를 끈 작품, 지워진 작품이 모두 이 화면으로 온다(어느 경우인지 구분해 알려 주지 않는다).
export default function PortfolioNotFound() {
  return <NotFoundView title="찾을 수 없는 작품이에요" text="주소가 잘못되었거나, 공개가 끝난 작품일 수 있어요." href="/creators" label="크리에이터 둘러보기" />;
}
