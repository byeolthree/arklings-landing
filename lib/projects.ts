import { applyFilter, type ProjectFilter } from "@/components/projects/filter";
import { projectsClosed } from "@/components/projects/sample-data";
import type { Project, ProjectSource, ProjectStatus } from "@/components/projects/types";
import { listMyContractsByApplication, type ContractStatus } from "@/lib/contracts";
import type { Role } from "@/lib/collab";
import { createAuthClient } from "@/lib/supabase/server";
import { kstIso } from "@/lib/time";
import { UUID_RE } from "@/lib/utils";

// 프로젝트(외주 매칭) 읽기. 모두 로그인한 본인의 권한(RLS)으로 읽고, 서버 전용 열쇠는 쓰지 않는다.
// 읽지 못하면 null(또는 failed)을 돌려 주고, 화면은 오류 안내만 보여 준다. 쓰기는 app/actions/projects.ts가 한다.
// 공고는 DB 보기 projects_public(0030)에서만 읽는다: 올린 운영자 번호·삭제 표시가 없고, 모집 상태와 지원자 수를 DB가 계산해 준다.

const COLS =
  "id, title, summary, description, roles, genres, reward_min, reward_max, opens_on, deadline_on, work_starts_on, work_ends_on, source, source_work_id, created_at, status, applicant_count, accepted_count";

type Row = {
  id: string;
  title: string;
  summary: string;
  description: string;
  roles: Role[];
  genres: string[];
  reward_min: number | null;
  reward_max: number | null;
  opens_on: string;
  deadline_on: string;
  work_starts_on: string | null;
  work_ends_on: string | null;
  source: ProjectSource;
  source_work_id: string | null;
  created_at: string;
  status: ProjectStatus;
  applicant_count: number;
  accepted_count: number;
};

type Sb = Awaited<ReturnType<typeof createAuthClient>>;

async function workTitles(sb: Sb): Promise<Map<string, string>> {
  const { data } = await sb.from("source_works").select("id, title");
  return new Map(((data ?? []) as { id: string; title: string }[]).map((w) => [w.id, w.title]));
}

function toProject(r: Row, works: Map<string, string>): Project {
  const negotiable = r.reward_min === null || r.reward_max === null;
  return {
    id: r.id,
    title: r.title,
    summary: r.summary,
    description: r.description,
    status: r.status,
    source: r.source,
    roles: r.roles,
    genres: r.genres,
    rewardMin: negotiable ? 0 : (r.reward_min as number),
    rewardMax: negotiable ? 0 : (r.reward_max as number),
    negotiable,
    postedAt: kstIso(new Date(r.created_at)).slice(0, 10),
    opensAt: r.opens_on,
    deadline: r.deadline_on,
    workStartsOn: r.work_starts_on,
    workEndsOn: r.work_ends_on,
    applicants: r.applicant_count,
    selected: r.accepted_count,
    work: r.source_work_id ? { id: r.source_work_id, title: works.get(r.source_work_id) ?? "" } : { id: "", title: "" },
  };
}

// 공고 전체(삭제 표시가 없는 것). 목록 화면이 이것을 받아 검색·거르기·정렬·쪽 나누기를 한다. 못 읽으면 null.
export async function listPublicProjects(): Promise<Project[] | null> {
  try {
    const sb = await createAuthClient();
    const [{ data, error }, works] = await Promise.all([
      sb.from("projects_public").select(COLS).order("created_at", { ascending: false }).limit(500),
      workTitles(sb),
    ]);
    if (error) return null;
    return ((data ?? []) as Row[]).map((r) => toProject(r, works));
  } catch {
    return null;
  }
}

// 공고 한 건. 없는 번호·형식이 틀린 번호는 project가 null이고 failed는 false다. 못 읽으면 failed가 true다.
export async function getPublicProject(id: string): Promise<{ project: Project | null; failed: boolean }> {
  if (!UUID_RE.test(id)) return { project: null, failed: false };
  try {
    const sb = await createAuthClient();
    const [{ data, error }, works] = await Promise.all([sb.from("projects_public").select(COLS).eq("id", id).maybeSingle(), workTitles(sb)]);
    if (error) return { project: null, failed: true };
    return { project: data ? toProject(data as Row, works) : null, failed: false };
  } catch {
    return { project: null, failed: true };
  }
}

// 목록 거르기·정렬. 보상이 「협의」인 공고는 보상 구간을 고르면 빠지고, 보상 높은순에서는 맨 뒤로 간다.
export function applyProjectFilter(all: Project[], f: ProjectFilter): Project[] {
  const list = applyFilter(f.reward ? all.filter((p) => !p.negotiable) : [...all], f);
  return f.sort === "reward" ? [...list.filter((p) => !p.negotiable), ...list.filter((p) => p.negotiable)] : list;
}

// 보상 글자: 「250만~400만 원」, 둘 다 비면 「협의」
export function rewardLabel(p: Project): string {
  return p.negotiable ? "협의" : `${p.rewardMin.toLocaleString("ko-KR")}만~${p.rewardMax.toLocaleString("ko-KR")}만 원`;
}

// ── 내 것(로그인한 본인) ──────────────────────────────────────────────────────

export type ApplicationStatus = "received" | "accepted" | "rejected";
export const APPLICATION_LABEL: Record<ApplicationStatus, string> = { received: "접수", accepted: "수락", rejected: "거절" };

// 한 공고에 대한 내 지원 상태. 지원하지 않았으면 null. 읽지 못해도 null(버튼은 「지원하기」로 두고, 지원하면 함수가 이미 지원했는지 다시 확인한다).
export async function myApplicationStatus(projectId: string, userId: string): Promise<ApplicationStatus | null> {
  try {
    const { data } = await (await createAuthClient())
      .from("project_applications")
      .select("status")
      .eq("project_id", projectId)
      .eq("applicant_id", userId)
      .maybeSingle();
    return (data as { status: ApplicationStatus } | null)?.status ?? null;
  } catch {
    return null;
  }
}

export type MyApplication = {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  decidedAt: string | null;
  projectId: string;
  projectTitle: string; // 내려간 공고면 빈 글자
  contract: { id: string; status: ContractStatus } | null; // 이 지원에 붙은 계약(없으면 null). production에서는 읽지 않는다
};

export async function listMyApplications(userId: string): Promise<MyApplication[] | null> {
  try {
    const { data, error } = await (await createAuthClient())
      .from("project_applications")
      .select("id, status, created_at, decided_at, project_id, projects(title)")
      .eq("applicant_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return null;
    const list = (data ?? []) as unknown as { id: string; status: ApplicationStatus; created_at: string; decided_at: string | null; project_id: string; projects: { title: string } | null }[];
    const contracts = projectsClosed() ? new Map<string, { id: string; status: ContractStatus }>() : await listMyContractsByApplication(list.map((r) => r.id));
    return list.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.created_at,
      decidedAt: r.decided_at,
      projectId: r.project_id,
      projectTitle: r.projects?.title ?? "",
      contract: contracts.get(r.id) ?? null,
    }));
  } catch {
    return null;
  }
}

// 내 북마크한 공고 번호들(목록·상세의 북마크 버튼이 켜진 상태로 그려지게). 못 읽으면 빈 목록이다.
export async function myBookmarkIds(userId: string): Promise<string[]> {
  try {
    const { data } = await (await createAuthClient()).from("project_bookmarks").select("project_id").eq("user_id", userId);
    return ((data ?? []) as { project_id: string }[]).map((r) => r.project_id);
  } catch {
    return [];
  }
}

// 내 북마크 목록(북마크한 최근 순). 지워졌거나 내려간 공고는 빠진다. 못 읽으면 null.
export async function listMyBookmarkedProjects(userId: string): Promise<Project[] | null> {
  try {
    const sb = await createAuthClient();
    const { data, error } = await sb.from("project_bookmarks").select("project_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200);
    if (error) return null;
    const ids = ((data ?? []) as { project_id: string }[]).map((r) => r.project_id);
    if (ids.length === 0) return [];
    const [{ data: rows, error: e2 }, works] = await Promise.all([sb.from("projects_public").select(COLS).in("id", ids), workTitles(sb)]);
    if (e2) return null;
    const byId = new Map(((rows ?? []) as Row[]).map((r) => [r.id, toProject(r, works)]));
    return ids.map((id) => byId.get(id)).filter((p): p is Project => Boolean(p));
  } catch {
    return null;
  }
}

// 내 크리에이터 프로필이 있는지(지원하기의 조건). 읽지 못하면 null.
export async function hasCreatorProfile(userId: string): Promise<boolean | null> {
  try {
    const { data, error } = await (await createAuthClient()).from("creator_profiles").select("user_id").eq("user_id", userId).maybeSingle();
    return error ? null : Boolean(data);
  } catch {
    return null;
  }
}

// 내 작품 목록(지원서에 붙일 포트폴리오). 못 읽으면 null.
export async function listMyWorks(userId: string): Promise<{ id: string; title: string }[] | null> {
  try {
    const { data, error } = await (await createAuthClient())
      .from("creator_works")
      .select("id, title")
      .eq("owner_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    return error ? null : ((data ?? []) as { id: string; title: string }[]);
  } catch {
    return null;
  }
}

// 공고 올리기 화면의 「연결 작품」 고르는 칸. 못 읽으면 빈 목록이다(연결은 선택).
export async function listSourceWorks(): Promise<{ id: string; title: string }[]> {
  try {
    const { data } = await (await createAuthClient()).from("source_works").select("id, title").order("sort_order", { ascending: true });
    return (data ?? []) as { id: string; title: string }[];
  } catch {
    return [];
  }
}

// 내가 올린 공고(내 프로젝트). 올린 운영자 번호(posted_by)는 표를 직접 읽어야 알 수 있어서, 먼저 내 공고 번호를 표에서 읽고
// 상태·지원자 수는 보기 projects_public에서 읽는다. 지워진 공고는 빠진다. 못 읽으면 null.
export async function listMyPostedProjects(userId: string): Promise<Project[] | null> {
  try {
    const sb = await createAuthClient();
    const { data, error } = await sb.from("projects").select("id").eq("posted_by", userId).is("deleted_at", null).order("created_at", { ascending: false }).limit(200);
    if (error) return null;
    const ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
    if (ids.length === 0) return [];
    const [{ data: rows, error: e2 }, works] = await Promise.all([sb.from("projects_public").select(COLS).in("id", ids), workTitles(sb)]);
    if (e2) return null;
    const byId = new Map(((rows ?? []) as Row[]).map((r) => [r.id, toProject(r, works)]));
    return ids.map((id) => byId.get(id)).filter((p): p is Project => Boolean(p));
  } catch {
    return null;
  }
}

// ── 운영자: 지원자 관리 ───────────────────────────────────────────────────────────

export type Applicant = {
  id: string;
  status: ApplicationStatus;
  motive: string;
  offeredReward: number | null;
  availablePeriod: string | null;
  createdAt: string;
  decidedAt: string | null;
  name: string; // 공개 이름(profiles.display_name)
  work: { id: string; title: string } | null; // 공개 작품이면 제목, 비공개·지워진 작품이면 null
};

// 한 공고의 지원 목록. DB 규칙(RLS)이 운영자에게만 모든 지원을 돌려준다(운영자가 아니면 내 지원만 오므로 화면은 먼저 운영자인지 확인한다).
// 포트폴리오 작품 제목은 공개 작품일 때만 읽을 수 있다(남의 비공개 작품은 운영자도 못 읽는다).
export async function listApplicants(projectId: string): Promise<Applicant[] | null> {
  try {
    const sb = await createAuthClient();
    const { data, error } = await sb
      .from("project_applications")
      .select("id, status, motive, offered_reward, available_period, created_at, decided_at, applicant_id, portfolio_work_id")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (error) return null;
    const rows = (data ?? []) as { id: string; status: ApplicationStatus; motive: string; offered_reward: number | null; available_period: string | null; created_at: string; decided_at: string | null; applicant_id: string; portfolio_work_id: string | null }[];
    const userIds = [...new Set(rows.map((r) => r.applicant_id))];
    const workIds = [...new Set(rows.map((r) => r.portfolio_work_id).filter((v): v is string => Boolean(v)))];
    const [names, works] = await Promise.all([
      userIds.length ? sb.from("profiles").select("id, display_name").in("id", userIds) : Promise.resolve({ data: [] }),
      workIds.length ? sb.from("creator_works_public").select("id, title").in("id", workIds) : Promise.resolve({ data: [] }),
    ]);
    const nameOf = new Map(((names.data ?? []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name ?? ""]));
    const workOf = new Map(((works.data ?? []) as { id: string; title: string }[]).map((w) => [w.id, w.title]));
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      motive: r.motive,
      offeredReward: r.offered_reward,
      availablePeriod: r.available_period,
      createdAt: r.created_at,
      decidedAt: r.decided_at,
      name: nameOf.get(r.applicant_id) || "이름 없음",
      work: r.portfolio_work_id && workOf.has(r.portfolio_work_id) ? { id: r.portfolio_work_id, title: workOf.get(r.portfolio_work_id) as string } : null,
    }));
  } catch {
    return null;
  }
}
