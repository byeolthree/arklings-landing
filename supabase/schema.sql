-- 미션6 협업 신청 (Supabase SQL Editor에서 실행)
-- 이번 미션은 로그인이 없어서 접근 제한(RLS)을 걸지 않는다. RLS는 미션7에서 켠다.
-- 이미 한 번 실행했어도 다시 실행하면 협업 신청 표를 새 구조로 다시 만든다. (샘플 데이터만 있을 때 사용)

-- 1) 신청 대상 원본
create table if not exists public.source_works (
  id          uuid primary key default gen_random_uuid(),
  title       text not null unique,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

insert into public.source_works (title, sort_order) values
  ('악의 꽃', 1),
  ('사다함의 꿈', 2),
  ('단 하나의 꿈', 3)
on conflict (title) do nothing;

-- 2) 협업 신청 (Figma 「협업 신청」 화면의 칸 그대로)
drop table if exists public.collab_requests cascade;
create table public.collab_requests (
  id               uuid primary key default gen_random_uuid(),
  applicant_name   text not null check (char_length(applicant_name) between 1 and 30),   -- 이름 / 닉네임
  contact          text not null check (char_length(contact) between 5 and 100),         -- 연락처 (이메일 또는 전화번호)
  sns_handle       text not null check (char_length(sns_handle) between 1 and 100),      -- SNS 아이디
  source_work_id   uuid references public.source_works(id),                              -- 신청 대상 (비어 있으면 '특정 이야기 아님')
  roles            text[] not null check (
                     cardinality(roles) >= 1
                     and roles <@ array['video','script','art_director','history_advisor','producer','other']
                   ),                                                                    -- 역할 (중복 선택)
  idea             text not null check (char_length(idea) between 10 and 1000),          -- 하고 싶은 일 / 아이디어
  portfolio_url    text not null check (portfolio_url ~* '^https?://'),                  -- 작업 링크
  consent          boolean not null check (consent = true),                              -- 개인정보 동의
  attachment_path  text,                                                                 -- 첨부 파일 보관 경로 (없으면 비움)
  attachment_name  text,                                                                 -- 첨부 파일 원래 이름
  status           text not null default 'received'
                   check (status in ('received','reviewing','accepted','rejected')),     -- 접수 / 검토 중 / 수락 / 거절
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index collab_requests_created_at_idx on public.collab_requests (created_at desc);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger collab_requests_set_updated_at
  before update on public.collab_requests
  for each row execute function public.set_updated_at();

-- 3) 첨부 파일 보관함 (공개 읽기, PDF/JPG/PNG, 4MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('collab-attachments', 'collab-attachments', true, 4194304,
        array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 로그인이 없는 이번 미션에서는 올리기·지우기를 모두에게 허용한다 (미션7에서 제한)
drop policy if exists "collab attachments insert" on storage.objects;
create policy "collab attachments insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'collab-attachments');
drop policy if exists "collab attachments delete" on storage.objects;
create policy "collab attachments delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'collab-attachments');

-- 4) 샘플 신청 1건 (테스트용 가짜 정보)
insert into public.collab_requests
  (applicant_name, contact, sns_handle, source_work_id, roles, idea, portfolio_url, consent, status)
select '테스트 작가', 'sample@example.com', '@test_artist', id, array['art_director'],
       '삼한 시대 복식 컨셉아트를 그려 보고 싶어서 신청합니다. (샘플 데이터)',
       'https://example.com/portfolio', true, 'received'
from public.source_works where title = '악의 꽃';
