-- 협업 신청: 신청자가 로그인한 사람이면 그 계정을 기록하고, 받는 사람의 답장·수락·거절을 사이트에도 저장한다.
-- Supabase 화면의 SQL Editor에서 실행한다. 기존 신청 데이터는 지우지 않고, 여러 번 실행해도 안전하다.
-- (0003, 0007 다음에 실행. 코드는 이 SQL이 없어도 깨지지 않게 만들어 두었다. 실행 전에는 신청자 기록·답장 저장만 건너뛴다.)
--
-- 규칙 요약
--   · 로그인 없이 보낸 신청: 지금처럼 메일로만 답장한다. 사이트에는 저장하지 않는다(보낸 사람을 알 수 없다).
--   · 로그인하고 보낸 신청: applicant_id에 그 계정이 기록되고, 답장은 메일과 사이트(collab_replies)에 함께 남는다.
--   · 읽기: 답장은 그 신청의 받는 사람과 신청자 본인만. 쓰기: 그 신청의 받는 사람만(이메일 확인을 마친 계정).
--   · 신청자 번호는 접수 뒤 바꿀 수 없다(신청자가 탈퇴해 번호가 비워지는 것만 허용).

-- 1) 신청자 번호
alter table public.collab_requests
  add column if not exists applicant_id uuid references auth.users(id) on delete set null;

create index if not exists collab_requests_applicant_idx on public.collab_requests (applicant_id, created_at desc);

-- 접수 뒤 바꿀 수 없는 칸에 신청자 번호를 더한다(0003의 함수를 같은 이름으로 다시 만든다).
create or replace function public.collab_requests_freeze_columns() returns trigger
language plpgsql
as $$
begin
  if new.recipient_kind is distinct from old.recipient_kind
     or (new.recipient_id is distinct from old.recipient_id and new.recipient_id is not null)
     or (new.applicant_id is distinct from old.applicant_id and new.applicant_id is not null)
     or new.plan_id is distinct from old.plan_id
     or new.created_at is distinct from old.created_at then
    raise exception 'collab_requests: recipient/applicant/plan/created_at cannot be changed';
  end if;
  return new;
end $$;

-- 2) 신청자 본인이 자기 신청을 읽을 수 있다(수정·삭제는 받는 사람만 그대로).
drop policy if exists "collab applicants select" on public.collab_requests;
create policy "collab applicants select" on public.collab_requests
  for select to authenticated
  using (applicant_id = (select auth.uid()));

-- 3) 답장·수락·거절 기록
create table if not exists public.collab_replies (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.collab_requests(id) on delete cascade,
  sender_id   uuid references auth.users(id) on delete set null,
  decision    text check (decision in ('accepted', 'rejected')),
  message     text not null default '' check (char_length(message) <= 1000),
  created_at  timestamptz not null default now()
);

create index if not exists collab_replies_request_idx on public.collab_replies (request_id, created_at);

alter table public.collab_replies enable row level security;

-- 읽기: 그 신청의 신청자 본인, 받는 사람(아클링스 앞 신청은 운영자). 아래 조회는 호출한 사람의 권한으로 신청 표를 읽는다.
drop policy if exists "collab replies select" on public.collab_replies;
create policy "collab replies select" on public.collab_replies
  for select to authenticated
  using (
    exists (
      select 1 from public.collab_requests r
      where r.id = collab_replies.request_id
        and (
          r.applicant_id = (select auth.uid())
          or r.recipient_id = (select auth.uid())
          or (r.recipient_kind = 'arklings' and (select public.is_admin()))
        )
    )
  );

-- 쓰기: 그 신청의 받는 사람만, 보낸 사람 번호는 본인 번호여야 하고 이메일 확인을 마친 계정이어야 한다.
drop policy if exists "collab replies insert" on public.collab_replies;
create policy "collab replies insert" on public.collab_replies
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select public.is_email_confirmed())
    and exists (
      select 1 from public.collab_requests r
      where r.id = collab_replies.request_id
        and (
          r.recipient_id = (select auth.uid())
          or (r.recipient_kind = 'arklings' and (select public.is_admin()))
        )
    )
  );
-- 수정·삭제 정책은 만들지 않는다 → 한번 남긴 답장은 바꾸거나 지울 수 없다(신청이 지워지면 함께 지워진다).
