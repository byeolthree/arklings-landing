"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { GENRES } from "@/components/creators/genres";
import { projectsClosed } from "@/components/projects/sample-data";
import { CONFIRM_FIRST_MESSAGE, getCurrentUser, isConfirmed, type CurrentUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-collab";
import { ROLES, type Role } from "@/lib/collab";
import { createAuthClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/utils";

// 프로젝트(외주 매칭) 쓰기. 모두 맨 위에서 로그인·이메일 확인을 다시 확인하고, 로그인한 본인의 권한(RLS)으로 DB 함수·표를 부른다.
// 운영자 동작(공고 올리기·수락·거절·마감)은 운영자인지도 다시 확인한다. DB 함수와 규칙(RLS)이 한 번 더 막는다.
// 실제 사이트(production)에서는 /projects 쪽 화면이 404인 지금 규칙에 맞춰 이 동작들도 막는다(북마크 해제는 예외).

const LOGIN_MESSAGE = "로그인이 풀렸어요. 다시 로그인한 뒤 시도해 주세요.";
const UNAVAILABLE = "지금은 처리할 수 없어요. 잠시 뒤에 다시 시도해 주세요.";
const CLOSED_MESSAGE = "이 기능은 아직 열려 있지 않아요.";

// DB 함수가 돌려주는 글자 코드 → 한국어 안내(0031)
const FUNCTION_MESSAGES: Record<string, string> = {
  not_logged_in: LOGIN_MESSAGE,
  email_not_confirmed: CONFIRM_FIRST_MESSAGE,
  no_creator_profile: "크리에이터 프로필을 먼저 만들어야 지원할 수 있어요.",
  project_not_found: "찾을 수 없는 공고예요. 내려간 공고일 수 있어요.",
  project_not_open: "아직 모집이 시작되지 않은 공고예요.",
  project_closed: "모집이 마감된 공고예요.",
  already_applied: "이미 지원한 공고예요.",
  motive_invalid: "지원 동기는 10자 이상 500자 이하로 적어 주세요. (< > 글자는 쓸 수 없어요)",
  offer_invalid: "제안 보상은 0 이상 100000(만 원) 이하 숫자로 적어 주세요.",
  period_invalid: "가능한 기간은 60자 이하로 적어 주세요. (< > 글자는 쓸 수 없어요)",
  portfolio_required: "함께 보낼 포트폴리오(내 작품)를 골라 주세요.",
  portfolio_invalid: "내 작품만 포트폴리오로 보낼 수 있어요.",
  not_admin: "운영자만 할 수 있어요.",
  application_not_found: "찾을 수 없는 지원이에요.",
  already_decided: "이미 처리된 지원이에요. 화면을 새로 고쳐 확인해 주세요.",
  already_closed: "이미 모집이 마감된 공고예요.",
};

function functionMessage(error: { message?: string } | null): string {
  const text = error?.message ?? "";
  for (const [code, message] of Object.entries(FUNCTION_MESSAGES)) if (text.includes(code)) return message;
  return UNAVAILABLE;
}

type Gate = { ok: true; user: CurrentUser } | { ok: false; message: string };

// 로그인·이메일 확인을 다시 확인한다(화면에서 막았더라도 Server Action은 따로 열린 입구다).
async function needUser(): Promise<Gate> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: LOGIN_MESSAGE };
  if (!isConfirmed(user)) return { ok: false, message: CONFIRM_FIRST_MESSAGE };
  return { ok: true, user };
}

async function needAdmin(): Promise<Gate> {
  const gate = await needUser();
  if (!gate.ok) return gate;
  if (!(await isAdminUser())) return { ok: false, message: FUNCTION_MESSAGES.not_admin };
  return gate;
}

const hasBadChars = (s: string) => /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/.test(s);
const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");
const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

// ── 지원하기 ──────────────────────────────────────────────────────────────

export type ApplyState = {
  message?: string;
  errors?: { portfolio?: string; motive?: string; offer?: string; period?: string };
  values?: { portfolio: string; motive: string; offer: string; period: string };
};

export async function applyToProject(_prev: ApplyState, fd: FormData): Promise<ApplyState> {
  const values = { portfolio: text(fd, "portfolio"), motive: text(fd, "motive").trim(), offer: text(fd, "offer").trim(), period: text(fd, "period").trim() };
  if (projectsClosed()) return { message: CLOSED_MESSAGE, values };
  const gate = await needUser();
  if (!gate.ok) return { message: gate.message, values };

  const projectId = text(fd, "project_id");
  if (!UUID_RE.test(projectId)) return { message: FUNCTION_MESSAGES.project_not_found, values };

  const errors: NonNullable<ApplyState["errors"]> = {};
  if (!UUID_RE.test(values.portfolio)) errors.portfolio = FUNCTION_MESSAGES.portfolio_required;
  if (values.motive.length < 10 || values.motive.length > 500 || hasBadChars(values.motive)) errors.motive = FUNCTION_MESSAGES.motive_invalid;
  let offer: number | null = null;
  if (values.offer !== "") {
    if (!/^\d{1,6}$/.test(values.offer) || Number(values.offer) > 100000) errors.offer = FUNCTION_MESSAGES.offer_invalid;
    else offer = Number(values.offer);
  }
  if (values.period.length > 60 || hasBadChars(values.period)) errors.period = FUNCTION_MESSAGES.period_invalid;
  if (Object.keys(errors).length > 0) return { errors, values };

  let failure: string | null = null;
  try {
    const { error } = await (await createAuthClient()).rpc("apply_to_project", {
      p_project: projectId,
      p_work: values.portfolio,
      p_motive: values.motive,
      p_offer: offer,
      p_period: values.period === "" ? null : values.period,
    });
    if (error) failure = functionMessage(error);
  } catch {
    failure = UNAVAILABLE;
  }
  if (failure) return { message: failure, values };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/mypage/applications");
  redirect("/mypage/applications");
}

// ── 공고 올리기(운영자) ────────────────────────────────────────────────────────

export type PostState = {
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string | string[]>;
};

export async function createProject(_prev: PostState, fd: FormData): Promise<PostState> {
  const roles = fd.getAll("roles").map(String);
  const genres = fd.getAll("genres").map(String);
  const values: Record<string, string | string[]> = {
    title: text(fd, "title").trim(),
    summary: text(fd, "summary").trim(),
    description: text(fd, "description").trim(),
    roles,
    genres,
    reward_min: text(fd, "reward_min").trim(),
    reward_max: text(fd, "reward_max").trim(),
    opens_on: text(fd, "opens_on").trim(),
    deadline_on: text(fd, "deadline_on").trim(),
    work_starts_on: text(fd, "work_starts_on").trim(),
    work_ends_on: text(fd, "work_ends_on").trim(),
    source: text(fd, "source").trim(),
    source_work_id: text(fd, "source_work_id").trim(),
  };
  if (projectsClosed()) return { message: CLOSED_MESSAGE, values };
  const gate = await needAdmin();
  if (!gate.ok) return { message: gate.message, values };

  const v = values as Record<string, string> & { roles: string[]; genres: string[] };
  const errors: Record<string, string> = {};
  if (v.title.length < 2 || v.title.length > 60 || hasBadChars(v.title)) errors.title = "제목은 2자 이상 60자 이하로 적어 주세요. (< > 글자는 쓸 수 없어요)";
  if (v.summary.length < 10 || v.summary.length > 120 || hasBadChars(v.summary)) errors.summary = "한 줄 요약은 10자 이상 120자 이하로 적어 주세요.";
  if (v.description.length > 3000 || hasBadChars(v.description)) errors.description = "소개 글은 3000자까지 적을 수 있어요. (< > 글자는 쓸 수 없어요)";
  const roleOk = v.roles.length >= 1 && v.roles.length <= 6 && new Set(v.roles).size === v.roles.length && v.roles.every((r) => r in ROLES);
  if (!roleOk) errors.roles = "찾는 역할을 한 개 이상 골라 주세요.";
  if (v.genres.length > 13 || !v.genres.every((g) => GENRES.includes(g))) errors.genres = "장르를 다시 골라 주세요.";

  let rewardMin: number | null = null;
  let rewardMax: number | null = null;
  if (v.reward_min !== "" || v.reward_max !== "") {
    if (!/^\d{1,6}$/.test(v.reward_min) || !/^\d{1,6}$/.test(v.reward_max) || Number(v.reward_max) > 100000 || Number(v.reward_max) < Number(v.reward_min)) {
      errors.reward = "보상은 최소·최대를 둘 다 적고(만 원), 최대가 최소 이상이어야 해요. 협의면 둘 다 비워 두세요.";
    } else {
      rewardMin = Number(v.reward_min);
      rewardMax = Number(v.reward_max);
    }
  }
  if (!isYmd(v.opens_on)) errors.opens_on = "모집 시작일을 골라 주세요.";
  if (!isYmd(v.deadline_on)) errors.deadline_on = "모집 마감일을 골라 주세요.";
  else if (isYmd(v.opens_on) && v.deadline_on < v.opens_on) errors.deadline_on = "마감일은 시작일 이후여야 해요.";
  const hasStart = v.work_starts_on !== "";
  const hasEnd = v.work_ends_on !== "";
  if ((hasStart && !isYmd(v.work_starts_on)) || (hasEnd && !isYmd(v.work_ends_on)) || (hasStart && hasEnd && v.work_ends_on < v.work_starts_on)) {
    errors.work = "작업 기간을 다시 골라 주세요. (끝나는 날은 시작하는 날 이후여야 해요)";
  }
  if (v.source !== "arklings" && v.source !== "request") errors.source = "출처를 골라 주세요.";
  if (v.source_work_id !== "" && !UUID_RE.test(v.source_work_id)) errors.source_work_id = "연결 작품을 다시 골라 주세요.";
  if (Object.keys(errors).length > 0) return { errors, values };

  let id: string | null = null;
  let failure: string | null = null;
  try {
    const { data, error } = await (await createAuthClient())
      .from("projects")
      .insert({
        title: v.title,
        summary: v.summary,
        description: v.description,
        roles: v.roles as Role[],
        genres: v.genres,
        reward_min: rewardMin,
        reward_max: rewardMax,
        opens_on: v.opens_on,
        deadline_on: v.deadline_on,
        work_starts_on: hasStart ? v.work_starts_on : null,
        work_ends_on: hasEnd ? v.work_ends_on : null,
        source: v.source,
        source_work_id: v.source_work_id === "" ? null : v.source_work_id,
        posted_by: gate.user.id,
      })
      .select("id")
      .single();
    if (error) failure = error.code === "42501" ? FUNCTION_MESSAGES.not_admin : error.code === "23514" || error.code === "23503" ? "입력한 내용을 다시 확인해 주세요." : UNAVAILABLE;
    else id = (data as { id: string }).id;
  } catch {
    failure = UNAVAILABLE;
  }
  if (failure || !id) return { message: failure ?? UNAVAILABLE, values };

  revalidatePath("/projects");
  redirect(`/projects/${id}`);
}

// ── 지원자 관리(운영자): 수락 · 거절 · 모집 마감 ─────────────────────────────────

export type ManageState = { ok?: boolean; message?: string };

function refreshManage(projectId: string) {
  revalidatePath(`/projects/${projectId}/manage`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/", "layout"); // 상단 종 아이콘 개수
}

export async function acceptApplication(_prev: ManageState, fd: FormData): Promise<ManageState> {
  if (projectsClosed()) return { message: CLOSED_MESSAGE };
  const gate = await needAdmin();
  if (!gate.ok) return { message: gate.message };
  const applicationId = text(fd, "application_id");
  const projectId = text(fd, "project_id");
  if (!UUID_RE.test(applicationId) || !UUID_RE.test(projectId)) return { message: FUNCTION_MESSAGES.application_not_found };
  try {
    const { data, error } = await (await createAuthClient()).rpc("accept_application", { p_application: applicationId });
    if (error) return { message: functionMessage(error) };
    refreshManage(projectId);
    const n = typeof data === "number" ? data : 0;
    return { ok: true, message: `수락했어요. 나머지 접수 지원 ${n}건은 자동으로 거절되었고, 공고는 마감되었어요.` };
  } catch {
    return { message: UNAVAILABLE };
  }
}

export async function rejectApplication(_prev: ManageState, fd: FormData): Promise<ManageState> {
  if (projectsClosed()) return { message: CLOSED_MESSAGE };
  const gate = await needAdmin();
  if (!gate.ok) return { message: gate.message };
  const applicationId = text(fd, "application_id");
  const projectId = text(fd, "project_id");
  if (!UUID_RE.test(applicationId) || !UUID_RE.test(projectId)) return { message: FUNCTION_MESSAGES.application_not_found };
  try {
    const { error } = await (await createAuthClient()).rpc("reject_application", { p_application: applicationId });
    if (error) return { message: functionMessage(error) };
    refreshManage(projectId);
    return { ok: true, message: "거절했어요. 지원자에게 알림이 갔어요." };
  } catch {
    return { message: UNAVAILABLE };
  }
}

export async function closeProject(_prev: ManageState, fd: FormData): Promise<ManageState> {
  if (projectsClosed()) return { message: CLOSED_MESSAGE };
  const gate = await needAdmin();
  if (!gate.ok) return { message: gate.message };
  const projectId = text(fd, "project_id");
  if (!UUID_RE.test(projectId)) return { message: FUNCTION_MESSAGES.project_not_found };
  try {
    const { data, error } = await (await createAuthClient()).rpc("close_project", { p_project: projectId });
    if (error) return { message: functionMessage(error) };
    refreshManage(projectId);
    const n = typeof data === "number" ? data : 0;
    return { ok: true, message: `모집을 마감했어요. 접수 상태였던 지원 ${n}건은 거절 처리되고 알림이 갔어요.` };
  } catch {
    return { message: UNAVAILABLE };
  }
}

// ── 북마크 ──────────────────────────────────────────────────────────────────

// 북마크를 켜거나(on=true) 끈다. 내 것만 건드린다(DB 규칙 RLS도 같은 규칙). 이미 켜져 있는데 또 켜도 성공으로 본다.
export async function toggleBookmark(projectId: string, on: boolean): Promise<{ ok: boolean; message?: string }> {
  if (on && projectsClosed()) return { ok: false, message: CLOSED_MESSAGE };
  const gate = await needUser();
  if (!gate.ok) return { ok: false, message: gate.message };
  if (!UUID_RE.test(projectId)) return { ok: false, message: FUNCTION_MESSAGES.project_not_found };
  try {
    const sb = await createAuthClient();
    if (on) {
      const { error } = await sb.from("project_bookmarks").insert({ user_id: gate.user.id, project_id: projectId });
      if (error && error.code !== "23505") return { ok: false, message: error.code === "23503" ? FUNCTION_MESSAGES.project_not_found : UNAVAILABLE };
    } else {
      const { error } = await sb.from("project_bookmarks").delete().eq("user_id", gate.user.id).eq("project_id", projectId);
      if (error) return { ok: false, message: UNAVAILABLE };
    }
    revalidatePath("/mypage/bookmarks");
    return { ok: true };
  } catch {
    return { ok: false, message: UNAVAILABLE };
  }
}
