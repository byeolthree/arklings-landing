import { ROLES, type Role } from "@/lib/collab";
import { ROLE_TONE } from "./role-tone";

// 역할 태그(역할마다 다른 색, 글자는 흰색). 목록 카드와 프로필이 함께 쓴다.
// lead: 탐색 카드에서 첫 역할(대표 역할)은 ★과 역할 색 채우기, 나머지는 역할 색 외곽선으로 보인다(2026-11-13 시안 card11).
export function RoleTags({ roles, lead = false }: { roles: Role[]; lead?: boolean }) {
  return (
    <ul className={`cr-tags${lead ? " cr-tags-lead" : ""}`} aria-label="역할">
      {roles.map((r, i) => (
        <li key={r} className={`cr-tag ${ROLE_TONE[r]}${lead ? (i === 0 ? " lead" : " line") : ""}`}>
          {lead && i === 0 && <span aria-label="대표 역할">★ </span>}
          {ROLES[r]}
        </li>
      ))}
    </ul>
  );
}
