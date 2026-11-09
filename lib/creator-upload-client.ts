"use client";

// 브라우저에서 작품 파일(이미지·PDF)을 올리는 순서. 서버 동작(prepareFileUpload → finishFileUpload) 사이에서 보관함에 직접 올린다.
//   1) prepareFileUpload(workId, {kind, type, size})  → { path, token }  (서버가 규칙을 먼저 확인하고 1회용 자리를 준다)
//   2) uploadToSlot(path, token, file)                 → 보관함에 올린다 (이 파일의 함수)
//   3) finishFileUpload(workId, {path, kind, name})    → 서버가 올라온 파일을 다시 검사하고 요소를 만든다 (통과 못 하면 파일을 지운다)
// 1회용 자리(token)는 서버가 만든 그 파일 이름 하나에만 쓸 수 있어서, 이 연결에는 읽기·지우기 권한이 없다.
import { createClient } from "@supabase/supabase-js";
import type { FileKind } from "@/lib/creator-rules";

const BUCKET = "creator-works";

export async function uploadToSlot(path: string, token: string, file: File): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { ok: false, error: "지금은 파일을 올릴 수 없어요. 잠시 뒤에 다시 시도해 주세요." };
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await sb.storage.from(BUCKET).uploadToSignedUrl(path, token, file, { contentType: file.type });
  return error ? { ok: false, error: "파일을 올리지 못했어요. 잠시 뒤에 다시 시도해 주세요." } : { ok: true };
}

export const kindOfMime = (type: string): FileKind | null =>
  type === "video/mp4" ? "video" : type === "application/pdf" ? "document" : type === "image/jpeg" || type === "image/png" || type === "image/webp" ? "image" : null;
