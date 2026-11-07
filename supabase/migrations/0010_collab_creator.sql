-- 미션7 크리에이터: 협업 신청이 작품·크리에이터를 가리키게 한다 (D14 크리에이터 직접 받기, D30 작품 기록).
-- Supabase 화면의 SQL Editor에서 0009 다음에 실행한다. 기존 신청 데이터는 지우지 않고, 여러 번 실행해도 안전하다.
-- (이 SQL은 실행만 하면 아무것도 바뀌지 않는다. 코드는 이 SQL을 쓰는 부분을 아직 열지 않았다. 코드가 올라오기 전에 실행해도 예전 신청 접수는 그대로 동작한다.)
-- 기준 문서: docs/creator-pages-plan.md (D14, D16, D24, D29, D30), 0003·0007·0008(협업 신청 받는 사람 규칙).
--
-- 규칙 요약
--   · 작품으로 온 신청(work_id): 받는 사람은 DB가 그 작품의 주인으로 정한다. 공개된 작품, 공개된 프로필, 협업 신청을 받는 중인 크리에이터,
--     이메일 확인을 마친 주인이어야 한다. 앱이 다른 받는 사람을 보내도 주인으로 바뀐다(기획안 신청 0007과 같은 방식).
--   · 크리에이터에게 직접 온 신청(creator_handle): 받는 사람은 그 프로필의 주인. 위와 같은 조건(작품 대신 프로필이 공개이고 협업 신청을 받는 중).
--   · 작품 제목은 접수 순간의 글자를 work_title에 남긴다(작품을 나중에 지우거나 이름을 바꿔도 받은 신청에는 접수 때의 제목이 보인다).
--   · 기획안(plan_id)으로 오는 신청은 그대로다. 기획안과 작품·크리에이터는 한 신청에 함께 쓸 수 없다.
--   · 접수 뒤에는 작품·크리에이터 칸을 바꿀 수 없다(작품이 지워져 work_id가 비워지는 것만 허용).
--   · 협업 신청 받는 중(open_to_collab)이 꺼진 크리에이터에게는 작품으로도 직접도 신청할 수 없다. (정해진 규칙 D14·P6의 해석이라 확인이 필요하다)

-- 1) 칸 더하기 -------------------------------------------------------------------------------
alter table public.collab_requests
  add column if not exists work_id        uuid references public.creator_works(id) on delete set null,
  add column if not exists creator_handle text,
  add column if not exists work_title     text;

alter table public.collab_requests drop constraint if exists collab_requests_creator_handle_len;
alter table public.collab_requests add constraint collab_requests_creator_handle_len
  check (creator_handle is null or char_length(creator_handle) between 3 and 20);

alter table public.collab_requests drop constraint if exists collab_requests_work_title_len;
alter table public.collab_requests add constraint collab_requests_work_title_len
  check (work_title is null or char_length(work_title) between 1 and 60);

-- 기획안과 작품·크리에이터는 한 신청에 함께 쓸 수 없다.
alter table public.collab_requests drop constraint if exists collab_requests_target_check;
alter table public.collab_requests add constraint collab_requests_target_check
  check (plan_id is null or (work_id is null and creator_handle is null and work_title is null));

create index if not exists collab_requests_work_idx on public.collab_requests (work_id) where work_id is not null;

-- 2) 접수 뒤 바꿀 수 없는 칸에 작품·크리에이터를 더한다(0008의 함수를 같은 이름으로 다시 만든다) ---------------
create or replace function public.collab_requests_freeze_columns() returns trigger
language plpgsql
as $$
begin
  if new.recipient_kind is distinct from old.recipient_kind
     or (new.recipient_id is distinct from old.recipient_id and new.recipient_id is not null)
     or (new.applicant_id is distinct from old.applicant_id and new.applicant_id is not null)
     or (new.work_id is distinct from old.work_id and new.work_id is not null)
     or new.creator_handle is distinct from old.creator_handle
     or new.work_title is distinct from old.work_title
     or new.plan_id is distinct from old.plan_id
     or new.created_at is distinct from old.created_at then
    raise exception 'collab_requests: recipient/applicant/work/creator/plan/created_at cannot be changed';
  end if;
  return new;
end $$;

-- 3) 작품·크리에이터로 들어온 신청: 받는 사람은 DB가 정한다 ----------------------------------------------
--    작품·프로필 줄을 잠근 채(for share) 확인하므로, 확인과 저장 사이에 주인이 공개를 끄는 일이 끼어들 수 없다.
create or replace function public.collab_requests_apply_creator() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner  uuid;
  v_handle text;
  v_title  text;
begin
  if new.work_id is not null then
    select w.owner_id, cp.public_handle, w.title into v_owner, v_handle, v_title
      from public.creator_works w
      join public.creator_profiles cp on cp.user_id = w.owner_id
     where w.id = new.work_id
       and w.is_public and w.first_published_at is not null
       and cp.is_public and cp.open_to_collab
       for share of w, cp;
    if not found then
      raise exception 'creator_not_available';
    end if;
    new.creator_handle := v_handle;
    new.work_title     := v_title;
  elsif new.creator_handle is not null then
    select cp.user_id, cp.public_handle into v_owner, v_handle
      from public.creator_profiles cp
     where lower(cp.public_handle) = lower(new.creator_handle)
       and cp.is_public and cp.open_to_collab
       for share of cp;
    if not found then
      raise exception 'creator_not_available';
    end if;
    new.creator_handle := v_handle;
    new.work_title     := null;
  else
    return new;
  end if;

  if not exists (
    select 1 from auth.users u
     where u.id = v_owner and u.email is not null and u.email_confirmed_at is not null
  ) then
    raise exception 'creator_not_available';
  end if;

  new.recipient_kind := 'user';
  new.recipient_id   := v_owner;
  new.source_work_id := null;   -- 작품·크리에이터로 온 신청에는 「신청 대상 작품」 선택이 없다
  return new;
end $$;

drop trigger if exists collab_requests_apply_creator_check on public.collab_requests;
create trigger collab_requests_apply_creator_check
  before insert on public.collab_requests
  for each row execute function public.collab_requests_apply_creator();
