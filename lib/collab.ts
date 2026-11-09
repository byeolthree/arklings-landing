export const ROLES = {
  video: "영상 제작",
  script: "대본",
  art_director: "아트디렉터",
  history_advisor: "역사 자문",
  producer: "책임 프로듀서",
  other: "기타",
} as const;
export type Role = keyof typeof ROLES;

export const STATUSES = {
  received: "접수",
  reviewing: "검토 중",
  accepted: "수락",
  rejected: "거절",
} as const;
export type Status = keyof typeof STATUSES;

export type SourceWork = { id: string; title: string };

export type CollabRequest = {
  id: string;
  applicant_name: string;
  contact: string;
  sns_handle: string;
  source_work_id: string | null;
  roles: Role[];
  idea: string;
  portfolio_url: string;
  consent: boolean;
  attachment_path: string | null;
  attachment_name: string | null;
  status: Status;
  created_at: string;
  updated_at: string;
  applicant_id?: string | null; // 로그인하고 보낸 신청이면 그 계정(0008 SQL 전에는 없다)
  collab_replies?: { message: string; decision: "accepted" | "rejected" | null; created_at: string }[];
  plan_id: string | null; // 기획안으로 들어온 신청이면 그 기획안(지워지면 비워진다)
  work_id?: string | null; // 작품으로 들어온 신청이면 그 작품(0010. 작품이 지워지면 비워진다)
  work_title?: string | null; // 작품으로 들어온 신청의 접수 때 작품 제목(작품이 지워져도 남는다)
  creator_handle?: string | null; // 크리에이터(작품)로 들어온 신청이면 그 크리에이터의 공개 주소
  source_works?: { title: string } | null;
  plans?: { title: string } | null;
};

// 받은·보낸 신청의 「신청 대상」 표시(목록·상세·마이페이지가 같이 쓴다). 기획안 → 작품 → 크리에이터 → 아클링스 앞 일반 신청 순서로 본다.
// 크리에이터 이름은 호출하는 쪽이 공개 주소로 읽어 names에 넣어 준다(못 읽으면 공개 주소를 그대로 보여 준다).
export type CollabTarget = { kind: "plan" | "work" | "creator" | "general"; text: string };
export function collabTargetOf(
  r: Pick<CollabRequest, "plan_id" | "work_title" | "creator_handle" | "source_works" | "plans">,
  names: ReadonlyMap<string, string> = new Map(),
): CollabTarget {
  if (r.plan_id) return { kind: "plan", text: `기획안 「${r.plans?.title ?? "제목 없음"}」` };
  if (r.work_title) return { kind: "work", text: `「${r.work_title}」` };
  if (r.creator_handle) return { kind: "creator", text: names.get(r.creator_handle) ?? r.creator_handle };
  return { kind: "general", text: r.source_works?.title ?? "전체 협업 제안" };
}

export const NO_TARGET_LABEL = "특정 이야기 아님 (전체적인 협업 제안)";
export const PAGE_SIZE = 10;
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FieldErrors = Partial<Record<string, string>>;

export type ParsedForm = {
  values: Record<string, string>;
  roles: Role[];
  file: File | null;
  removeFile: boolean;
  errors: FieldErrors;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^\+?[0-9][0-9\- ]{7,16}[0-9]$/;

export function parseForm(fd: FormData, opts: { withStatus: boolean }): ParsedForm {
  const str = (k: string) => String(fd.get(k) ?? "").trim();
  const roles = fd.getAll("roles").map(String).filter((r): r is Role => r in ROLES);
  const values: Record<string, string> = {
    applicant_name: str("applicant_name"),
    contact: str("contact"),
    sns_handle: str("sns_handle"),
    source_work_id: str("source_work_id"),
    roles: roles.join(","),
    idea: str("idea"),
    portfolio_url: str("portfolio_url"),
    consent: fd.get("consent") === "on" ? "on" : "",
    status: opts.withStatus ? str("status") : "received",
  };
  const errors: FieldErrors = {};
  if (values.applicant_name.length < 1 || values.applicant_name.length > 30)
    errors.applicant_name = "이름 또는 닉네임을 30자 이내로 입력해 주세요.";
  if (!EMAIL_RE.test(values.contact) && !PHONE_RE.test(values.contact))
    errors.contact = "이메일 또는 전화번호 형식으로 입력해 주세요.";
  if (values.sns_handle.length < 1 || values.sns_handle.length > 100)
    errors.sns_handle = "SNS 아이디를 입력해 주세요.";
  if (values.source_work_id && !UUID_RE.test(values.source_work_id))
    errors.source_work_id = "신청 대상을 다시 선택해 주세요.";
  if (roles.length === 0) errors.roles = "역할을 하나 이상 선택해 주세요.";
  if (values.idea.length < 10 || values.idea.length > 1000)
    errors.idea = "하고 싶은 일은 10~1000자로 적어 주세요.";
  if (!/^https?:\/\/\S+$/i.test(values.portfolio_url))
    errors.portfolio_url = "http:// 또는 https:// 로 시작하는 주소를 입력해 주세요.";
  if (!values.consent) errors.consent = "개인정보 수집·이용에 동의해 주세요.";
  if (opts.withStatus && !(values.status in STATUSES)) errors.status = "상태를 선택해 주세요.";

  const f = fd.get("attachment");
  const file = f instanceof File && f.size > 0 ? f : null;
  if (file) {
    if (!ALLOWED_TYPES.includes(file.type)) errors.attachment = "PDF, JPG, PNG 파일만 올릴 수 있습니다.";
    else if (file.size > MAX_FILE_BYTES) errors.attachment = "파일 크기는 4MB 이하여야 합니다. 더 큰 파일은 「작업 링크」 칸에 링크로 남겨 주세요.";
  }
  return { values, roles, file, removeFile: fd.get("remove_attachment") === "on", errors };
}
