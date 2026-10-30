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
  source_works?: { title: string } | null;
};

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
