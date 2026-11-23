import { NotFoundView } from "@/components/creators/state-views";

// 없는 번호가 이 화면으로 온다.
export default function ProjectNotFound() {
  return <NotFoundView title="찾을 수 없는 프로젝트예요" text="주소가 잘못되었거나, 내려간 공고일 수 있어요." href="/projects" label="프로젝트 목록 보기" />;
}
