-- 프로젝트(외주 매칭) 2단계 ③: 처리 함수. 지원하기 / 수락하기 / 거절하기 / 모집 마감하기, 그리고 마감을 처리하는 안쪽 전용 함수.
-- Supabase 화면의 SQL Editor에서 0030 다음에 실행한다. 여러 번 실행해도 안전하다(함수는 같은 이름으로 다시 만든다).
-- ※ 이 함수들은 알림을 넣을 때 0032의 public._notify()를 부른다. 0032를 실행하기 전에는 함수를 불러도 동작하지 않으므로,
--   0029~0033을 모두 실행한 뒤에 화면·처리 코드를 연결한다.
--
-- 규칙 요약
--   · 지원하기(apply_to_project): 로그인 + 이메일 확인 + 크리에이터 프로필이 있는 사람만. 공고가 모집 중(시작일~마감일, 닫히지 않음, 삭제 아님)일 때만.
--     포트폴리오는 본인 작품이어야 한다. 이미 지원했으면 막는다. 성공하면 공고를 올린 운영자에게 「새 지원」 알림.
--   · 수락하기(accept_application): 운영자만. 한 번의 처리 안에서 ① 그 지원을 수락 ② 같은 공고의 나머지 접수 지원을 자동 거절
--     ③ 공고를 닫고(closed_at) ④ 알림(수락 1건, 자동 거절 각 1건)을 넣는다. 중간에 실패하면 전부 되돌아간다.
--   · 거절하기(reject_application): 운영자만. 접수 상태인 지원 하나를 거절하고 「직접 거절」 알림. 공고는 닫지 않는다.
--   · 모집 마감하기(close_project): 운영자만. 공고를 닫고, 접수 상태로 남은 지원을 모두 거절하고 「마감」 알림.
--   · 마감 처리의 실제 규칙은 안쪽 전용 함수 _close_project()에 한 번만 둔다. 운영자용 close_project와 하루 한 번 예약 실행(0033)이 같은 함수를 부른다.
--   · 같은 공고를 건드리는 처리끼리는 공고 줄을 먼저 잠근다(지원하기는 공유 잠금, 수락·마감·거절은 배타 잠금). 순서는 늘 「공고 → 지원」이라 서로 기다리다 멈추지 않는다.
--     그래서 수락과 지원이 동시에 와도, 마감 뒤에 접수 지원이 남지 않고 수락은 1건뿐이다.
--   · 모든 함수는 만든 사람 권한으로 실행되고(security definer), 맨 위에서 로그인·권한을 다시 확인한다. 함수 이름은 앱이 부르는 이름이다.
--   · 오류는 글자 코드로 돌려준다: not_logged_in, email_not_confirmed, no_creator_profile, project_not_found, project_not_open, project_closed,
--     already_applied, motive_invalid, offer_invalid, period_invalid, portfolio_required, portfolio_invalid, not_admin, application_not_found, already_decided, already_closed.
--
-- 이 파일이 쓰는 것: projects(0029), project_applications(0030), is_admin()(0003), is_email_confirmed()(0007), profiles(0002), creator_profiles·creator_works(0009), _notify()(0032).

-- 1) 마감을 처리하는 안쪽 전용 함수 --------------------------------------------------------------------
--    돌려주는 값: 이번에 거절된 접수 지원의 수. 이미 닫혔거나 없는 공고면 비어 있다(null).
create or replace function public._close_project(p_id uuid) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proj public.projects%rowtype;
  v_n    integer := 0;
  r      record;
begin
  select * into v_proj from public.projects where id = p_id for update;
  if not found or v_proj.closed_at is not null then
    return null;
  end if;

  perform set_config('app.project_fn', '1', true);   -- closed_at을 함수가 바꾸는 중이라는 표시(0029 저장 직전 검사)
  update public.projects set closed_at = now() where id = p_id;

  for r in
    with rej as (
      update public.project_applications
         set status = 'rejected', decided_at = now()
       where project_id = p_id and status = 'received'
      returning applicant_id
    )
    select applicant_id from rej
  loop
    perform public._notify(r.applicant_id, 'project_closed', '/projects/' || p_id::text,
                           '「' || v_proj.title || '」 모집이 마감되었어요');
    v_n := v_n + 1;
  end loop;
  perform set_config('app.project_fn', '', true);
  return v_n;
end;
$$;

-- 2) 지원하기 --------------------------------------------------------------------------------------------
create or replace function public.apply_to_project(
  p_project uuid,
  p_work    uuid,
  p_motive  text,
  p_offer   integer default null,
  p_period  text    default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_proj   public.projects%rowtype;
  v_motive text := btrim(coalesce(p_motive, ''));
  v_period text := nullif(btrim(coalesce(p_period, '')), '');
  v_id     uuid;
  v_name   text;
begin
  if v_uid is null then
    raise exception 'not_logged_in' using errcode = '28000';
  end if;
  if not (select public.is_email_confirmed()) then
    raise exception 'email_not_confirmed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.creator_profiles where user_id = v_uid) then
    raise exception 'no_creator_profile' using errcode = '42501';
  end if;

  -- 입력 검사(표의 검사와 같은 규칙을 먼저 적용해 알아보기 쉬운 코드로 돌려준다)
  if char_length(v_motive) < 10 or char_length(v_motive) > 500 or v_motive ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f<>]' then
    raise exception 'motive_invalid';
  end if;
  if p_offer is not null and (p_offer < 0 or p_offer > 100000) then
    raise exception 'offer_invalid';
  end if;
  if v_period is not null and (char_length(v_period) > 60 or v_period ~ '[\u0001-\u001f\u007f<>]') then
    raise exception 'period_invalid';
  end if;
  if p_work is null then
    raise exception 'portfolio_required';
  end if;
  if not exists (select 1 from public.creator_works where id = p_work and owner_id = v_uid) then
    raise exception 'portfolio_invalid';
  end if;

  -- 공고 줄을 공유 잠금으로 잡는다: 수락·마감(배타 잠금)과 겹치면 그쪽이 끝날 때까지 기다린다.
  select * into v_proj from public.projects where id = p_project and deleted_at is null for share;
  if not found then
    raise exception 'project_not_found';
  end if;
  if v_proj.closed_at is not null or v_proj.deadline_on < public.kst_today() then
    raise exception 'project_closed';
  end if;
  if v_proj.opens_on > public.kst_today() then
    raise exception 'project_not_open';
  end if;

  insert into public.project_applications (project_id, applicant_id, portfolio_work_id, motive, offered_reward, available_period)
  values (p_project, v_uid, p_work, v_motive, p_offer, v_period)
  on conflict (project_id, applicant_id) do nothing
  returning id into v_id;
  if v_id is null then
    raise exception 'already_applied';
  end if;

  select display_name into v_name from public.profiles where id = v_uid;
  perform public._notify(v_proj.posted_by, 'project_new_application', '/projects/' || p_project::text,
                         coalesce(nullif(v_name, ''), '지원자') || '님이 「' || v_proj.title || '」에 지원했어요');
  return v_id;
end;
$$;

-- 3) 수락하기 --------------------------------------------------------------------------------------------
--    돌려주는 값: 이번에 자동 거절된 지원의 수.
create or replace function public.accept_application(p_application uuid) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pid  uuid;
  v_proj public.projects%rowtype;
  v_app  public.project_applications%rowtype;
  v_n    integer := 0;
  r      record;
begin
  if (select auth.uid()) is null then
    raise exception 'not_logged_in' using errcode = '28000';
  end if;
  if not (select public.is_admin()) or not (select public.is_email_confirmed()) then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  select project_id into v_pid from public.project_applications where id = p_application;
  if not found then
    raise exception 'application_not_found';
  end if;
  -- 잠그는 순서: 공고 → 지원(다른 처리와 같은 순서)
  select * into v_proj from public.projects where id = v_pid and deleted_at is null for update;
  if not found then
    raise exception 'project_not_found';
  end if;
  select * into v_app from public.project_applications where id = p_application for update;
  if not found then
    raise exception 'application_not_found';
  end if;
  if v_app.status <> 'received' then
    raise exception 'already_decided';
  end if;
  if v_proj.closed_at is not null then
    raise exception 'already_closed';
  end if;

  update public.project_applications set status = 'accepted', decided_at = now() where id = p_application;

  for r in
    with rej as (
      update public.project_applications
         set status = 'rejected', decided_at = now()
       where project_id = v_pid and status = 'received'
      returning applicant_id
    )
    select applicant_id from rej
  loop
    perform public._notify(r.applicant_id, 'project_auto_rejected', '/projects/' || v_pid::text,
                           '「' || v_proj.title || '」은 다른 분이 선정되어 마감되었어요');
    v_n := v_n + 1;
  end loop;

  perform set_config('app.project_fn', '1', true);
  update public.projects set closed_at = now() where id = v_pid;
  perform set_config('app.project_fn', '', true);

  perform public._notify(v_app.applicant_id, 'project_accepted', '/projects/' || v_pid::text,
                         '「' || v_proj.title || '」에 선정되었어요');
  return v_n;
end;
$$;

-- 4) 거절하기(직접 거절) -----------------------------------------------------------------------------------
create or replace function public.reject_application(p_application uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pid  uuid;
  v_proj public.projects%rowtype;
  v_app  public.project_applications%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'not_logged_in' using errcode = '28000';
  end if;
  if not (select public.is_admin()) or not (select public.is_email_confirmed()) then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  select project_id into v_pid from public.project_applications where id = p_application;
  if not found then
    raise exception 'application_not_found';
  end if;
  select * into v_proj from public.projects where id = v_pid and deleted_at is null for update;
  if not found then
    raise exception 'project_not_found';
  end if;
  select * into v_app from public.project_applications where id = p_application for update;
  if not found then
    raise exception 'application_not_found';
  end if;
  if v_app.status <> 'received' then
    raise exception 'already_decided';
  end if;

  update public.project_applications set status = 'rejected', decided_at = now() where id = p_application;
  perform public._notify(v_app.applicant_id, 'project_rejected', '/projects/' || v_pid::text,
                         '「' || v_proj.title || '」 지원이 이번에는 선정되지 않았어요');
end;
$$;

-- 5) 모집 마감하기 ----------------------------------------------------------------------------------------
--    돌려주는 값: 이번에 거절된 접수 지원의 수.
create or replace function public.close_project(p_project uuid) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  if (select auth.uid()) is null then
    raise exception 'not_logged_in' using errcode = '28000';
  end if;
  if not (select public.is_admin()) or not (select public.is_email_confirmed()) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if not exists (select 1 from public.projects where id = p_project and deleted_at is null) then
    raise exception 'project_not_found';
  end if;
  v_n := public._close_project(p_project);
  if v_n is null then
    raise exception 'already_closed';
  end if;
  return v_n;
end;
$$;

-- 6) 실행 권한 ---------------------------------------------------------------------------------------------
--    브라우저(로그인한 사용자)가 부를 수 있는 것은 네 함수뿐이다. 안쪽 전용 함수는 아무도 직접 못 부른다(함수 안에서는 만든 사람 권한으로 부른다).
revoke all on function public._close_project(uuid) from public, anon, authenticated;
revoke all on function public.apply_to_project(uuid, uuid, text, integer, text) from public, anon, authenticated;
revoke all on function public.accept_application(uuid) from public, anon, authenticated;
revoke all on function public.reject_application(uuid) from public, anon, authenticated;
revoke all on function public.close_project(uuid) from public, anon, authenticated;
grant execute on function public.apply_to_project(uuid, uuid, text, integer, text) to authenticated;
grant execute on function public.accept_application(uuid) to authenticated;
grant execute on function public.reject_application(uuid) to authenticated;
grant execute on function public.close_project(uuid) to authenticated;
