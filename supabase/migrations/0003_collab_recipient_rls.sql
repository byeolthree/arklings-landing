-- 미션7 단계 2: 협업 신청에 「받는 사람」을 두고, 받는 사람만 읽고·고치고·지울 수 있게 접근 규칙(RLS)을 건다.
-- Supabase 화면의 SQL Editor에서 실행한다. 기존 신청 데이터는 지우지 않고, 여러 번 실행해도 안전하다.
--
-- ※ 실행 순서(중요): 새 코드를 먼저 배포하고(SUPABASE_SERVICE_ROLE_KEY 환경 변수도 넣어 둔 뒤) 이 SQL을 실행한다.
--   이 SQL을 실행하면 로그인 없는 직접 접근이 모두 닫히므로, 예전 코드는 신청 접수·목록이 동작하지 않는다.
--
-- 규칙 요약
--   · 신청 접수(쓰기): 로그인 없이 누구나 보낼 수 있지만, DB를 직접 여는 길은 주지 않는다. 앱 서버가 검사한 뒤 서버 전용 열쇠로 저장한다.
--   · 읽기·수정·삭제: 그 신청의 받는 사람만. 아클링스 앞으로 온 신청은 운영자 표시가 있는 계정이 본다.
--   · 첨부 보관함: 비공개. 올리기·읽기·삭제는 앱 서버만 한다.

-- 1) 운영자 표시: 화면에는 드러나지 않는다. 아키텍터의 평소 계정 UUID를 아래 4번처럼 한 줄 넣으면 된다.
create table if not exists public.admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.admins enable row level security;
-- 정책을 하나도 만들지 않는다 → 앱(로그인한 사용자)이 이 표를 직접 읽거나 고칠 수 없다.

create or replace function public.is_admin() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2) 받는 사람 칸
alter table public.collab_requests
  add column if not exists recipient_kind text not null default 'arklings',
  add column if not exists recipient_id   uuid references auth.users(id) on delete set null,
  add column if not exists plan_id        uuid;   -- 어느 기획안에서 온 신청인지(단계 3에서 기획안 표가 생기면 연결)

alter table public.collab_requests drop constraint if exists collab_requests_recipient_kind_check;
alter table public.collab_requests add constraint collab_requests_recipient_kind_check
  check (recipient_kind in ('arklings', 'user'));

-- 아클링스 앞 신청은 받는 사람 번호가 없다. 회원 앞 신청은 번호가 있지만, 받는 사람이 탈퇴하면 비워진다.
alter table public.collab_requests drop constraint if exists collab_requests_recipient_shape_check;
alter table public.collab_requests add constraint collab_requests_recipient_shape_check
  check (recipient_kind = 'user' or recipient_id is null);

create index if not exists collab_requests_recipient_idx on public.collab_requests (recipient_id, created_at desc);

-- 받는 사람·기획안·접수 시각은 접수 뒤 바꿀 수 없다. (받는 사람이 탈퇴해 번호가 비워지는 것만 허용)
create or replace function public.collab_requests_freeze_columns() returns trigger
language plpgsql
as $$
begin
  if new.recipient_kind is distinct from old.recipient_kind
     or (new.recipient_id is distinct from old.recipient_id and new.recipient_id is not null)
     or new.plan_id is distinct from old.plan_id
     or new.created_at is distinct from old.created_at then
    raise exception 'collab_requests: recipient/plan/created_at cannot be changed';
  end if;
  return new;
end $$;

drop trigger if exists collab_requests_freeze on public.collab_requests;
create trigger collab_requests_freeze
  before update on public.collab_requests
  for each row execute function public.collab_requests_freeze_columns();

-- 3) 접근 규칙(RLS)
alter table public.collab_requests enable row level security;

drop policy if exists "collab recipients select" on public.collab_requests;
create policy "collab recipients select" on public.collab_requests
  for select to authenticated
  using (
    recipient_id = (select auth.uid())
    or (recipient_kind = 'arklings' and (select public.is_admin()))
  );

drop policy if exists "collab recipients update" on public.collab_requests;
create policy "collab recipients update" on public.collab_requests
  for update to authenticated
  using (
    recipient_id = (select auth.uid())
    or (recipient_kind = 'arklings' and (select public.is_admin()))
  )
  with check (
    recipient_id = (select auth.uid())
    or (recipient_kind = 'arklings' and (select public.is_admin()))
  );

drop policy if exists "collab recipients delete" on public.collab_requests;
create policy "collab recipients delete" on public.collab_requests
  for delete to authenticated
  using (
    recipient_id = (select auth.uid())
    or (recipient_kind = 'arklings' and (select public.is_admin()))
  );
-- insert 정책은 만들지 않는다 → 로그인 여부와 상관없이 DB를 직접 열어 신청을 넣을 수 없고, 서버 전용 열쇠만 가능하다.

-- 신청 대상 목록(작품 3건)은 공개 정보라 누구나 읽을 수 있다.
alter table public.source_works enable row level security;
drop policy if exists "source_works read all" on public.source_works;
create policy "source_works read all" on public.source_works
  for select to anon, authenticated using (true);

-- 4) 봇 방지: 접속 주소(소금과 함께 해시한 값)와 시각만 짧게 기록한다. 앱 서버만 읽고 쓴다.
create table if not exists public.submit_attempts (
  id          bigint generated always as identity primary key,
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists submit_attempts_lookup_idx on public.submit_attempts (ip_hash, created_at desc);
alter table public.submit_attempts enable row level security;
-- 정책 없음 → 서버 전용 열쇠만 접근한다.

-- 5) 첨부 보관함: 비공개이고, 로그인 없는 올리기·읽기·삭제 정책을 모두 걷어 낸다.
update storage.buckets set public = false where id = 'collab-attachments';
drop policy if exists "collab attachments insert" on storage.objects;
drop policy if exists "collab attachments select" on storage.objects;
drop policy if exists "collab attachments delete" on storage.objects;

-- 6) 운영자 표시 달기 (아키텍터가 평소 계정으로 가입한 뒤, 그 계정의 UUID를 넣어 한 번 실행한다)
--    UUID는 Supabase 화면 Authentication → Users에서 볼 수 있다.
-- insert into public.admins (user_id) values ('여기에-UUID') on conflict do nothing;
