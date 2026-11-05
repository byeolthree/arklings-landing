"use client";

import { ErrorView } from "@/components/creators/error-view";

export default function PortfolioError({ retry }: { error: Error; retry: () => void }) {
  return <ErrorView title="포트폴리오를 불러오지 못했어요" retry={retry} />;
}
