"use client";

import { ErrorView } from "@/components/creators/error-view";

// 오류 화면의 「다시 시도」 대신 새로고침으로 눌러 볼 수 있게 한 샘플 미리보기용 감싸개
export function ErrorPreview({ title }: { title: string }) {
  return <ErrorView title={title} retry={() => window.location.reload()} />;
}
