-- 미션7-2 라이브러리 질의응답: 위키 표(질문 하나 + 답 하나 + 출처 이름). 빈 표에서도 동작한다.
-- Supabase 화면의 SQL Editor에서 0018 다음에 실행한다. 기존 표·데이터는 건드리지 않고, 여러 번 실행해도 안전하다.
-- (이 SQL은 실행만 하면 기존 화면에 아무 영향이 없다.)
-- 기준 문서: docs/mission7-2-llm-plan.md 7장·P3. 위키 파일 형식과 항목 수(O1)는 아직 열려 있어 예시 3개까지만 넣는다.
-- 이 SQL은 0002의 set_updated_at()을 쓴다.
--
-- 규칙 요약
--   · 공개 여부(is_public)가 켜진 항목만 누구나 읽는다(로그인 없이도). 공개 전 항목은 DB가 막는다.
--   · 쓰기 정책은 만들지 않는다. 항목은 Supabase 화면에서 넣고 고친다.
--   · 서버 전용 열쇠는 쓰지 않는다. 서버는 로그인한 본인의 연결(createAuthClient)이나 로그인 없는 연결로 같은 규칙에 따라 읽는다.
--   · 시대 표시(era)는 열국시대~삼한일통기 안의 이름을 글자로 적는다(D10). 값의 목록은 정해지지 않아 글자 길이만 막는다.
--   · 예시 3개는 기능을 시험하기 위한 설명 글이다(역사 내용 없음). 비공개(is_public=false)로 넣는다.
--     시험할 때만 아래 한 줄로 공개로 켜고, 실제 자료가 올라오면 예시 3개는 지운다.
--       update public.library_wiki set is_public = true where id in (
--         '00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000a2','00000000-0000-4000-8000-0000000000a3');

create table if not exists public.library_wiki (
  id          uuid primary key default gen_random_uuid(),
  question    text not null check (char_length(question) between 1 and 200),
  answer      text not null check (char_length(answer) between 1 and 4000),
  source      text not null check (char_length(source) between 1 and 100),   -- 출처 이름(답 아래 「근거 자료」에 그대로 보인다)
  era         text not null check (char_length(era) between 1 and 20),       -- 시대 표시
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists library_wiki_public_idx on public.library_wiki (created_at desc) where is_public;

drop trigger if exists library_wiki_set_updated_at on public.library_wiki;
create trigger library_wiki_set_updated_at
  before update on public.library_wiki
  for each row execute function public.set_updated_at();

alter table public.library_wiki enable row level security;

drop policy if exists "wiki read public" on public.library_wiki;
create policy "wiki read public" on public.library_wiki
  for select to anon, authenticated
  using (is_public);
-- 쓰기(insert·update·delete) 정책은 만들지 않는다.

-- 예시 3개 (비공개). 같은 번호가 이미 있으면 다시 넣지 않는다.
insert into public.library_wiki (id, question, answer, source, era, is_public) values
  ('00000000-0000-4000-8000-0000000000a1', '[예시] 이 라이브러리는 어떤 시대를 다루나요?',
   '[시험용 예시] 열국시대부터 삼한일통기까지를 다룹니다. 실제 자료가 올라오면 이 항목은 지워 주세요.', '시험용 예시 1', '열국시대', false),
  ('00000000-0000-4000-8000-0000000000a2', '[예시] 자료에 없는 내용을 물으면 어떻게 답하나요?',
   '[시험용 예시] 자료에 없는 내용은 지어내지 않고 「이 자료에는 없는 내용이에요」라고 알려 줍니다.', '시험용 예시 2', '삼한일통기', false),
  ('00000000-0000-4000-8000-0000000000a3', '[예시] 답 아래의 근거 자료 이름은 어디에서 오나요?',
   '[시험용 예시] 근거 자료 이름은 AI가 쓴 글이 아니라, 서버가 고른 위키 항목의 출처 칸에서 가져와 보여 줍니다.', '시험용 예시 3', '삼한일통기', false)
on conflict (id) do nothing;
