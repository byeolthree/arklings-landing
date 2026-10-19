import type { Metadata } from "next";
import { createCollab } from "@/app/actions/collab";
import { CollabForm } from "@/components/collab-form";
import { PaperPage } from "@/components/paper-card";
import { getSupabase } from "@/lib/supabase";
import type { SourceWork } from "@/lib/collab";

export const metadata: Metadata = { title: "협업 신청" };
export const dynamic = "force-dynamic"; // 빌드 때가 아니라 열 때마다 신청 대상 목록을 읽는다

export default async function NewCollabPage() {
  const { data, error } = await getSupabase().from("source_works").select("id, title").order("sort_order");
  if (error) throw new Error(error.message);
  return (
    <PaperPage>
      <CollabForm action={createCollab} works={(data ?? []) as SourceWork[]} cancelHref="/collab" />
    </PaperPage>
  );
}
