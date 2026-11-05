"use client";

import { ErrorView } from "@/components/creators/error-view";

export default function CreatorsError({ retry }: { error: Error; retry: () => void }) {
  return <ErrorView title="크리에이터를 불러오지 못했어요" retry={retry} />;
}
