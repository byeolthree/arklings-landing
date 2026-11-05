import { ROLES, type Role } from "@/lib/collab";
import { ROLE_TONE } from "./role-tone";

// 역할 태그(역할마다 다른 색, 글자는 흰색). 목록 카드와 프로필이 함께 쓴다.
export function RoleTags({ roles }: { roles: Role[] }) {
  return (
    <ul className="cr-tags" aria-label="역할">
      {roles.map((r) => (
        <li key={r} className={`cr-tag ${ROLE_TONE[r]}`}>
          {ROLES[r]}
        </li>
      ))}
    </ul>
  );
}
