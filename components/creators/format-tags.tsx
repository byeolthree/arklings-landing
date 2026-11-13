import type { Format } from "@/lib/creator-cards";

// 작품에 등록한 포맷 전부(작품 안 순서대로, 대표 카드 종류 글자와 같은 청록 글씨). 탐색 카드·크리에이터 상세·작품 상세에서 역할 태그 바로 위에 둔다(2026-11-14).
export function FormatTags({ formats }: { formats?: Format[] }) {
  if (!formats || formats.length === 0) return null;
  return (
    <ul className="cr-fmts" aria-label="등록한 포맷">
      {formats.map((f, i) => (
        <li key={i} className="cr-fmt">
          {f.label}
        </li>
      ))}
    </ul>
  );
}
