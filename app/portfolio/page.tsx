import { redirect } from "next/navigation";

// 포트폴리오는 크리에이터가 올린 작품 단위로 바뀌었다(D29). 예전 목록 주소는 크리에이터 목록으로 보낸다.
export default function PortfolioListPage() {
  redirect("/creators");
}
