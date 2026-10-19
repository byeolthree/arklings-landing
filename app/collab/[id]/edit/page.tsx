import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateCollab } from "@/app/actions/collab";
import { CollabForm } from "@/components/collab-form";
import { PaperPage } from "@/components/paper-card";
import { getSupabase } from "@/lib/supabase";
import { UUID_RE, type CollabRequest, type SourceWork } from "@/lib/collab";

export const metadata: Metadata = { title: "협업 신청 수정" };

export default async function EditCollabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const sb = getSupabase();
  const [{ data: row, error }, { data: works }] = await Promise.all([
    sb.from("collab_requests").select("*").eq("id", id).maybeSingle(),
    sb.from("source_works").select("id, title").order("sort_order"),
  ]);
  if (error) throw new Error(error.message);
  if (!row) notFound();
  return (
    <PaperPage>
      <CollabForm action={updateCollab.bind(null, id)} works={(works ?? []) as SourceWork[]} initial={row as CollabRequest} cancelHref={`/collab/${id}`} />
    </PaperPage>
  );
}
