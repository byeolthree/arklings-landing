-- 팀 미션 시연용 데이터(시드). 0029~0035를 실행한 DB에서 SQL Editor로 실행한다.
-- 무엇을 넣나: 「[시연]」 공고 4개(모집 중 3개, 마감 1개)와, 공개 크리에이터 프로필이 있는 계정의 지원서 몇 건.
-- 공고를 올린 사람은 운영자 표(admins)의 첫 계정, 지원자는 공개 크리에이터 프로필을 가진 계정 중 운영자가 아닌 앞의 두 명이다.
-- 여러 번 실행해도 같은 제목의 「[시연]」 공고가 있으면 새로 넣지 않는다.
-- 지우는 방법(숨김): update public.projects set deleted_at = now() where title like '[시연]%' and deleted_at is null;
-- 계약·결제는 시드로 넣지 않는다. 시연 때 화면에서 수락 → 동의 → 서명 → 토스 테스트 결제 순서로 직접 만든다.

do $seed$
declare
  v_admin uuid;
  v_c1 uuid;
  v_c2 uuid;
  v_p uuid;
  r record;
begin
  select user_id into v_admin from public.admins order by created_at limit 1;
  if v_admin is null then
    raise exception 'admins 표에 운영자 계정이 없습니다';
  end if;
  select user_id into v_c1 from public.creator_profiles
   where is_public and user_id <> v_admin order by created_at limit 1;
  select user_id into v_c2 from public.creator_profiles
   where is_public and user_id <> v_admin and user_id is distinct from v_c1 order by created_at limit 1;

  for r in
    select * from (values
      ('[시연] 「사다함의 꿈」 2화 콘티', '2화 대본을 콘티 20컷으로 옮겨 줄 작가를 찾습니다', '완성된 2화 대본을 받아 장면마다 콘티를 그립니다. 신라 복식 참고 자료를 함께 드립니다.', array['script','art_director'], array['드라마','전쟁'], 100, 200, 14, false),
      ('[시연] 「악의 꽃」 1분 예고 영상', '콘티와 원고를 받아 1분 예고 영상을 편집합니다', '콘티 20컷과 내레이션 원고를 드립니다. 음악은 무료 음원 안에서 고릅니다.', array['video'], array['스릴러','드라마'], 150, 300, 10, false),
      ('[시연] 열국시대 복식 고증 자문', '삼한 시대 의복과 장신구 고증을 두 번 자문해 주실 분', '등장인물 6명의 의복 설정을 검토하고 고칠 점을 알려 주세요. 자문은 두 번, 화상 회의로 합니다.', array['history_advisor'], array['다큐멘터리'], 60, 140, 21, false),
      ('[시연] 「단 하나의 꿈」 세계관 설정집 정리', '흩어진 세계관 메모를 설정집 한 권으로 묶는 일입니다', '지명·인물·연표 메모를 받아 목차와 본문으로 정리합니다.', array['script'], array['판타지'], 80, 120, 7, true)
    ) as t(title, summary, description, roles, genres, rmin, rmax, days_open, closed)
  loop
    if exists (select 1 from public.projects where title = r.title and deleted_at is null) then
      continue;
    end if;
    insert into public.projects (title, summary, description, roles, genres, reward_min, reward_max,
                                 opens_on, deadline_on, source, posted_by)
    values (r.title, r.summary, r.description, r.roles, r.genres, r.rmin, r.rmax,
            public.kst_today(), public.kst_today() + r.days_open, 'arklings', v_admin)
    returning id into v_p;

    if v_c1 is not null then
      insert into public.project_applications (project_id, applicant_id, motive, offered_reward, available_period)
      values (v_p, v_c1, '시연용 지원서입니다. 비슷한 작업을 해 본 경험이 있습니다.', r.rmin + 20, '2주');
    end if;
    if v_c2 is not null and not r.closed then
      insert into public.project_applications (project_id, applicant_id, motive, offered_reward, available_period)
      values (v_p, v_c2, '시연용 지원서입니다. 일정 안에 마칠 수 있습니다.', r.rmax, '한 달');
    end if;

    if r.closed then
      -- 마감 공고 하나: 처리 함수 안쪽 규칙(app.project_fn)으로 마감 시각을 찍고 접수 지원은 거절한다.
      perform set_config('app.project_fn', '1', true);
      update public.project_applications set status = 'rejected', decided_at = now()
       where project_id = v_p and status = 'received';
      update public.projects set closed_at = now() where id = v_p;
      perform set_config('app.project_fn', '', true);
    end if;
  end loop;
end $seed$;

-- 확인(읽기만)
select title, closed_at is not null as closed,
       (select count(*) from public.project_applications a where a.project_id = p.id) as applications
  from public.projects p where title like '[시연]%' and deleted_at is null order by created_at;
