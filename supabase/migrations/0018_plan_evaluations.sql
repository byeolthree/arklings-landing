-- 미션7-2 AI 평가: 평가 결과를 기획안 내용과 따로 저장한다(P5).
-- Supabase 화면의 SQL Editor에서 0017 다음에 실행한다. 기존 표·데이터는 건드리지 않고, 여러 번 실행해도 안전하다.
-- (이 SQL은 실행만 하면 기존 화면에 아무 영향이 없다.)
-- 기준 문서: docs/mission7-2-llm-plan.md 5장·P5·8장.
-- 이 SQL은 0004(plans)와 0007(is_email_confirmed)을 쓴다.
--
-- 규칙 요약
--   · 평가 결과는 plans.public_content(공개용 사본)나 plan_revisions에 섞지 않는다. 평가는 제안이며 기획안 글을 바꾸지 않는다.
--   · 로그인한 본인의 권한(RLS)으로 본인 것만 읽고·쓰고·지운다. 쓰기는 이메일 확인을 마친 계정만 한다.
--   · 입력 사본에는 평가 요청에 실은 다섯 칸 글·예/아니오·고친 글을 담는다(평가를 다시 읽어 볼 수 있게).
--     키와 프롬프트 전문은 담지 않는다. 모델 이름·토큰 사용량·완료 사유만 따로 남긴다(교재 10-3·10-4).
--   · 기획안이 지워져도 평가 결과는 남고 연결만 비워진다(탈퇴하면 owner_id가 지워지며 함께 사라진다).
--   · 이 표는 하루 5번 한도(0017) 안에서만 늘어난다. 오래된 결과의 정리 기준은 정해지지 않았다.

create table if not exists public.plan_evaluations (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  plan_id        uuid references public.plans(id) on delete set null,  -- 저장하지 않은 기획안도 평가할 수 있다
  section        text not null check (section in ('logline')),          -- 평가 기준은 섹션(페이지) 단위로 갈아 끼운다
  input          jsonb not null,                                        -- 평가 요청에 실은 내용 사본
  result         jsonb not null,                                        -- 칸별 결과(label·status·reason·fix)
  model          text not null check (char_length(model) between 1 and 100),
  input_tokens   integer check (input_tokens is null or input_tokens >= 0),
  output_tokens  integer check (output_tokens is null or output_tokens >= 0),
  finish_reason  text check (finish_reason is null or char_length(finish_reason) <= 40),
  created_at     timestamptz not null default now(),
  constraint plan_evaluations_shape check (
    jsonb_typeof(input) = 'object' and jsonb_typeof(result) = 'object'
    and pg_column_size(input) + pg_column_size(result) < 40000
  )
);

create index if not exists plan_evaluations_owner_idx on public.plan_evaluations (owner_id, created_at desc);
create index if not exists plan_evaluations_plan_idx on public.plan_evaluations (plan_id) where plan_id is not null;

alter table public.plan_evaluations enable row level security;

drop policy if exists "evaluations read own" on public.plan_evaluations;
create policy "evaluations read own" on public.plan_evaluations
  for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "evaluations insert own" on public.plan_evaluations;
create policy "evaluations insert own" on public.plan_evaluations
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select public.is_email_confirmed())
    and (plan_id is null or exists (select 1 from public.plans p where p.id = plan_id and p.owner_id = (select auth.uid())))
  );

drop policy if exists "evaluations delete own" on public.plan_evaluations;
create policy "evaluations delete own" on public.plan_evaluations
  for delete to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_email_confirmed()));
-- 고치기(update) 정책은 만들지 않는다. 평가 결과는 한 번 남기면 바뀌지 않는다.
