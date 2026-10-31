// 첨부 파일 서버 검사. 브라우저가 알려 주는 파일 형식(file.type)은 속일 수 있으므로, 파일 맨 앞 글자(시그니처)를 직접 확인한다.
import { MAX_FILE_BYTES } from "@/lib/collab";

type Kind = { type: "application/pdf" | "image/png" | "image/jpeg"; ext: "pdf" | "png" | "jpg" };

function startsWith(bytes: Uint8Array, sig: number[]): boolean {
  return sig.every((b, i) => bytes[i] === b);
}

export async function verifyAttachment(file: File): Promise<{ ok: true; kind: Kind } | { ok: false; error: string }> {
  if (file.size <= 0) return { ok: false, error: "비어 있는 파일은 올릴 수 없습니다." };
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: "파일 크기는 4MB 이하여야 합니다. 더 큰 파일은 「작업 링크」 칸에 링크로 남겨 주세요." };
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());

  let kind: Kind | null = null;
  if (startsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2d])) kind = { type: "application/pdf", ext: "pdf" }; // %PDF-
  else if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) kind = { type: "image/png", ext: "png" };
  else if (startsWith(head, [0xff, 0xd8, 0xff])) kind = { type: "image/jpeg", ext: "jpg" };

  if (!kind) return { ok: false, error: "PDF, JPG, PNG 파일만 올릴 수 있습니다." };
  // 파일이 알려 준 형식과 실제 내용이 다르면 거절한다(예: 이름만 .png로 바꾼 파일).
  if (file.type && file.type !== kind.type) return { ok: false, error: "파일 내용과 형식이 맞지 않습니다. PDF, JPG, PNG 파일만 올릴 수 있습니다." };
  return { ok: true, kind };
}
