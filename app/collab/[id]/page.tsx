import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { outlineBtn, PaperCard, PaperPage } from "@/components/paper-card";
import { StatusBadge } from "@/components/status-badge";
import { requireGateAccess } from "@/lib/admin-gate";
import { BUCKET, getSupabase } from "@/lib/supabase";
import { formatKst } from "@/lib/time";
import { ROLES, UUID_RE, type CollabRequest } from "@/lib/collab";

export const metadata: Metadata = { title: "협업 신청 상세", robots: { index: false, follow: false } };

// 첨부 파일 주소는 이 시간(초) 동안만 열린다. 화면을 새로 열면 다시 만든다.
const FILE_URL_SECONDS = 300;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[8.5rem_1fr]">
      <dt className="text-[13px] text-[#574a4f]">{k}</dt>
      <dd className="text-[14px] text-[#292126]">{children}</dd>
    </div>
  );
}

export default async function CollabDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  await requireGateAccess(`/collab/${UUID_RE.test(id) ? id : ""}`);
  const sp = await searchParams;
  if (!UUID_RE.test(id)) notFound();

  const sb = getSupabase();
  const { data, error } = await sb.from("collab_requests").select("*, source_works(title)").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();
  const r = data as CollabRequest;

  let fileUrl: string | null = null;
  let fileFailed = false;
  if (r.attachment_path) {
    const signed = await sb.storage.from(BUCKET).createSignedUrl(r.attachment_path, FILE_URL_SECONDS);
    if (signed.error || !signed.data) fileFailed = true;
    else fileUrl = signed.data.signedUrl;
  }
  const isPdf = r.attachment_path?.endsWith(".pdf");
  const saved = sp.saved === "updated" ? "수정 내용이 저장되었습니다." : null;

  return (
    <PaperPage wide>
      <PaperCard className="!px-5 md:!p-10">
        <Link href="/collab" className="text-[13px] text-jaju">← 목록으로</Link>
        {saved && <p role="status" className="mt-4 rounded-lg border border-sage bg-sage/20 px-3 py-2 text-[13px] text-title">{saved}</p>}

        <div className="mt-4 flex items-center justify-between gap-4">
          <h1 className="text-[20px] font-bold text-[#292126] md:text-[24px]">{r.applicant_name}</h1>
          <StatusBadge status={r.status} />
        </div>

        <dl className="mt-4 divide-y divide-[#e8dfe3] border-y border-[#e8dfe3]">
          <Row k="연락처">{r.contact}</Row>
          <Row k="SNS 아이디">{r.sns_handle}</Row>
          <Row k="신청 대상">{r.source_works?.title ?? "특정 이야기 아님 (전체적인 협업 제안)"}</Row>
          <Row k="역할">{r.roles.map((x) => ROLES[x]).join(" · ")}</Row>
          <Row k="하고 싶은 일 / 아이디어"><span className="whitespace-pre-wrap">{r.idea}</span></Row>
          <Row k="작업 링크">
            <a href={r.portfolio_url} target="_blank" rel="noopener noreferrer" className="break-all text-jaju underline">{r.portfolio_url}</a>
          </Row>
          <Row k="첨부 파일">
            {fileUrl ? (
              isPdf ? (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-jaju underline">{r.attachment_name} (PDF 열기)</a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl} alt={`${r.applicant_name}의 첨부 이미지: ${r.attachment_name}`} className="max-h-96 rounded-lg border border-[#e8dfe3]" />
              )
            ) : fileFailed ? (
              <span role="alert" className="text-destructive">첨부 파일을 불러오지 못했습니다. 화면을 새로 열어 다시 확인해 주세요.</span>
            ) : (
              <span className="text-[#574a4f]">첨부된 파일이 없습니다.</span>
            )}
          </Row>
          <Row k="신청일">{formatKst(r.created_at)}</Row>
          <Row k="최근 수정">{formatKst(r.updated_at)}</Row>
        </dl>

        <div className="mt-6 flex items-start gap-3">
          <Link href={`/collab/${r.id}/edit`} className={outlineBtn}>수정</Link>
          <DeleteButton id={r.id} />
        </div>
      </PaperCard>
    </PaperPage>
  );
}
