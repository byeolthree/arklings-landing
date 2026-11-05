"use client";

import { CollabForm } from "@/components/collab-form";

// 샘플: 보내기를 눌러도 아무 일도 일어나지 않는다.
export function PreviewCollabForm(props: Omit<React.ComponentProps<typeof CollabForm>, "action" | "works">) {
  return <CollabForm {...props} action={async () => ({})} works={[]} />;
}
