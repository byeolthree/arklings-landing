-- 팀미션 「계약·결제」(공고 3.6.1~3.6.3): 금액 합의 → 계약서 서명 → 토스 테스트 결제 → 납품 요청 → 완료 승인 → 정산 기록.
-- 0034 다음에 arklings-landing DB에서 실행한다. 기존 표의 데이터는 바꾸지 않고, 여러 번 실행해도 안전하다.
--
-- 역할: 운영자(is_admin()) = 의뢰인이자 결제하는 사람, 크리에이터(지원자) = 작업하는 사람.
-- 금액 단위: 계약·결제는 원(won). 공고의 보상 칸(만 원)과 단위가 다르다.
-- 돈과 계약 상태는 아래 처리 함수로만 바뀐다. 화면은 읽기만 한다(표에 쓰기 권한 없음).
--
-- 계약 상태(contracts.status)
--   offered   : 운영자가 수락하며 금액·기간을 제시함. 크리에이터의 동의/거부를 기다림
--   declined  : 크리에이터가 거부함. 지원은 거절, 공고는 다시 모집 중
--   signing   : 동의함. 양측 서명을 기다림(시작일 = 동의한 날, 종료일 = 시작일 + 기간)
--   active    : 양측 서명 완료 = 체결
--   cancelled : 체결 전에 한쪽이 취소함. 지원은 거절, 공고는 다시 모집 중
--   completed : 운영자가 완료를 승인함
-- 결제 상태(payments.status): ready(주문 저장) → paid(토스 승인) → paid_out(완료 승인·정산 기록) / failed
-- 수수료 = 금액 ÷ 10 몫(1원 단위 버림), 정산액 = 금액 − 수수료. 실제 이체는 없다.

-- 0) 지원 저장 직전 검사(0030)에 「처리 함수 안에서는 수락→거절을 허용」을 더한다. ----------------------------
create or replace function public.project_applications_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.project_id <> old.project_id or new.applicant_id <> old.applicant_id or new.motive <> old.motive
     or new.offered_reward is distinct from old.offered_reward or new.available_period is distinct from old.available_period then
    raise exception 'application_frozen';
  end if;
  if old.status <> 'received' and new.status <> old.status
     and not (old.status = 'accepted' and new.status = 'rejected'
              and coalesce(current_setting('app.project_fn', true), '') = '1') then
    raise exception 'already_decided';
  end if;
  return new;
end;
$$;

-- 1) 계약 표 --------------------------------------------------------------------------------------------
create table if not exists public.contracts (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects(id) on delete cascade,
  application_id     uuid not null references public.project_applications(id) on delete cascade,
  admin_id           uuid references auth.users(id) on delete set null,             -- 수락한 운영자
  creator_id         uuid not null references auth.users(id) on delete cascade,     -- 지원한 크리에이터
  amount_won         integer not null,                                              -- 합의 금액(원)
  days               integer not null,                                              -- 작업 기간(일)
  status             text not null default 'offered',
  starts_on          date,
  ends_on            date,
  responded_at       timestamptz,                                                   -- 동의·거부한 시각
  admin_signed_at    timestamptz,
  creator_signed_at  timestamptz,
  closed_at          timestamptz,                                                   -- 거부·취소·완료 시각
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.contracts drop constraint if exists contracts_application_key;
alter table public.contracts add constraint contracts_application_key unique (application_id);
alter table public.contracts drop constraint if exists contracts_amount_check;
alter table public.contracts add constraint contracts_amount_check check (amount_won between 10000 and 1000000000);
alter table public.contracts drop constraint if exists contracts_days_check;
alter table public.contracts add constraint contracts_days_check check (days between 1 and 365);
alter table public.contracts drop constraint if exists contracts_status_check;
alter table public.contracts add constraint contracts_status_check
  check (status in ('offered', 'declined', 'signing', 'active', 'cancelled', 'completed'));
alter table public.contracts drop constraint if exists contracts_dates_check;
alter table public.contracts add constraint contracts_dates_check
  check ((status in ('offered', 'declined')) or (starts_on is not null and ends_on is not null and ends_on >= starts_on));

-- 한 공고에 진행 중인 계약은 하나뿐
create unique index if not exists contracts_one_open_uidx
  on public.contracts (project_id) where status in ('offered', 'signing', 'active');
create index if not exists contracts_creator_idx on public.contracts (creator_id, created_at desc);

drop trigger if exists contracts_set_updated_at on public.contracts;
create trigger contracts_set_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

alter table public.contracts enable row level security;
revoke all on public.contracts from anon, authenticated;
grant select on public.contracts to authenticated;

drop policy if exists "contracts read parties" on public.contracts;
create policy "contracts read parties" on public.contracts
  for select to authenticated
  using (creator_id = (select auth.uid()) or (select public.is_admin()));

-- 2) 결제 표 --------------------------------------------------------------------------------------------
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  contract_id   uuid not null references public.contracts(id) on delete cascade,
  order_id      text not null,                       -- 토스에 보내는 주문번호
  amount_won    integer not null,                    -- 저장해 둔 결제 금액(승인 때 이 값과 비교)
  payment_key   text,                                -- 토스 결제키(승인 뒤)
  status        text not null default 'ready',
  fail_code     text,
  approved_at   timestamptz,
  delivered_at  timestamptz,                         -- 크리에이터의 납품 요청 시각
  completed_at  timestamptz,                         -- 운영자의 완료 승인 시각
  fee_won       integer,
  payout_won    integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.payments drop constraint if exists payments_contract_key;
alter table public.payments add constraint payments_contract_key unique (contract_id);
alter table public.payments drop constraint if exists payments_order_key;
alter table public.payments add constraint payments_order_key unique (order_id);
alter table public.payments drop constraint if exists payments_order_check;
alter table public.payments add constraint payments_order_check check (order_id ~ '^[A-Za-z0-9_-]{6,64}$');
alter table public.payments drop constraint if exists payments_amount_check;
alter table public.payments add constraint payments_amount_check check (amount_won between 10000 and 1000000000);
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (status in ('ready', 'paid', 'paid_out', 'failed'));
alter table public.payments drop constraint if exists payments_paid_check;
alter table public.payments add constraint payments_paid_check
  check (status not in ('paid', 'paid_out') or (payment_key is not null and approved_at is not null));
alter table public.payments drop constraint if exists payments_payout_check;
alter table public.payments add constraint payments_payout_check
  check (status <> 'paid_out' or (fee_won = amount_won / 10 and payout_won = amount_won - fee_won and completed_at is not null));

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

drop policy if exists "payments read parties" on public.payments;
create policy "payments read parties" on public.payments
  for select to authenticated
  using ((select public.is_admin())
         or exists (select 1 from public.contracts c where c.id = contract_id and c.creator_id = (select auth.uid())));

-- 3) 알림 종류를 늘린다(0032 목록 + 계약·결제) --------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('project_new_application', 'project_accepted', 'project_auto_rejected', 'project_rejected', 'project_closed',
                  'contract_offered', 'contract_agreed', 'contract_declined', 'contract_signed', 'contract_cancelled',
                  'payment_paid', 'delivery_requested', 'work_completed'));

-- 4) 처리 함수 ------------------------------------------------------------------------------------------
-- 안쪽 전용: 계약을 접고(거부·취소) 지원을 거절하고 공고를 다시 연다. 자동 거절된 다른 지원은 되살리지 않는다.
create or replace function public._reopen_after_contract(p_contract uuid, p_status text) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.contracts%rowtype;
begin
  select * into v_c from public.contracts where id = p_contract;
  update public.contracts set status = p_status, closed_at = now() where id = p_contract;
  perform set_config('app.project_fn', '1', true);
  update public.project_applications set status = 'rejected', decided_at = now() where id = v_c.application_id;
  update public.projects set closed_at = null where id = v_c.project_id and deleted_at is null;
  perform set_config('app.project_fn', '', true);
end;
$$;
revoke all on function public._reopen_after_contract(uuid, text) from public, anon, authenticated;

-- 운영자: 지원을 수락하며 금액(원)과 기간(일)을 제시한다. 0031 accept_application을 그대로 부르고 계약을 만든다.
create or replace function public.accept_with_offer(p_application uuid, p_amount_won integer, p_days integer) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app public.project_applications%rowtype;
  v_title text;
  v_id uuid;
begin
  if p_amount_won is null or p_amount_won not between 10000 and 1000000000 then
    raise exception 'amount_invalid';
  end if;
  if p_days is null or p_days not between 1 and 365 then
    raise exception 'days_invalid';
  end if;
  perform public.accept_application(p_application);          -- 로그인·운영자·상태 검사와 자동 거절·마감은 여기서 한다
  select * into v_app from public.project_applications where id = p_application;
  select title into v_title from public.projects where id = v_app.project_id;
  insert into public.contracts (project_id, application_id, admin_id, creator_id, amount_won, days)
  values (v_app.project_id, v_app.id, (select auth.uid()), v_app.applicant_id, p_amount_won, p_days)
  returning id into v_id;
  perform public._notify(v_app.applicant_id, 'contract_offered', '/contracts/' || v_id::text,
                         '「' || v_title || '」 계약 금액 ' || to_char(p_amount_won, 'FM999,999,999,999') || '원이 제시되었어요');
  return v_id;
end;
$$;

-- 크리에이터: 제시 금액에 동의하거나 거부한다(재제안 없음).
create or replace function public.respond_offer(p_contract uuid, p_agree boolean) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.contracts%rowtype;
  v_title text;
begin
  if (select auth.uid()) is null then
    raise exception 'not_logged_in' using errcode = '28000';
  end if;
  select * into v_c from public.contracts where id = p_contract for update;
  if not found or v_c.creator_id <> (select auth.uid()) then
    raise exception 'contract_not_found';
  end if;
  if v_c.status <> 'offered' then
    raise exception 'contract_not_offered';
  end if;
  select title into v_title from public.projects where id = v_c.project_id;
  if p_agree then
    update public.contracts
       set status = 'signing', responded_at = now(),
           starts_on = public.kst_today(), ends_on = public.kst_today() + v_c.days
     where id = p_contract;
    perform public._notify(v_c.admin_id, 'contract_agreed', '/contracts/' || p_contract::text,
                           '「' || v_title || '」 계약 금액에 동의했어요. 계약서에 서명해 주세요');
    return 'signing';
  end if;
  update public.contracts set responded_at = now() where id = p_contract;
  perform public._reopen_after_contract(p_contract, 'declined');
  perform public._notify(v_c.admin_id, 'contract_declined', '/projects/' || v_c.project_id::text,
                         '「' || v_title || '」 계약 금액이 거부되어 공고가 다시 모집 중이에요');
  return 'declined';
end;
$$;

-- 양측: 계약서에 서명한다. 둘 다 서명하면 체결(active).
create or replace function public.sign_contract(p_contract uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_c public.contracts%rowtype;
  v_title text;
begin
  if v_uid is null then
    raise exception 'not_logged_in' using errcode = '28000';
  end if;
  select * into v_c from public.contracts where id = p_contract for update;
  if not found or not (v_c.creator_id = v_uid or (select public.is_admin())) then
    raise exception 'contract_not_found';
  end if;
  if v_c.status <> 'signing' then
    raise exception 'contract_not_signing';
  end if;
  if v_c.creator_id = v_uid then
    if v_c.creator_signed_at is not null then raise exception 'already_signed'; end if;
    update public.contracts set creator_signed_at = now() where id = p_contract returning * into v_c;
  else
    if v_c.admin_signed_at is not null then raise exception 'already_signed'; end if;
    update public.contracts set admin_signed_at = now() where id = p_contract returning * into v_c;
  end if;
  if v_c.admin_signed_at is not null and v_c.creator_signed_at is not null then
    update public.contracts set status = 'active' where id = p_contract;
    select title into v_title from public.projects where id = v_c.project_id;
    perform public._notify(v_c.creator_id, 'contract_signed', '/contracts/' || p_contract::text,
                           '「' || v_title || '」 계약이 체결되었어요');
    perform public._notify(v_c.admin_id, 'contract_signed', '/contracts/' || p_contract::text,
                           '「' || v_title || '」 계약이 체결되었어요. 결제를 진행해 주세요');
    return 'active';
  end if;
  return 'signing';
end;
$$;

-- 양측: 체결 전(offered·signing)에만 취소한다.
create or replace function public.cancel_contract(p_contract uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_c public.contracts%rowtype;
  v_title text;
begin
  if v_uid is null then
    raise exception 'not_logged_in' using errcode = '28000';
  end if;
  select * into v_c from public.contracts where id = p_contract for update;
  if not found or not (v_c.creator_id = v_uid or (select public.is_admin())) then
    raise exception 'contract_not_found';
  end if;
  if v_c.status not in ('offered', 'signing') then
    raise exception 'contract_not_cancellable';
  end if;
  perform public._reopen_after_contract(p_contract, 'cancelled');
  select title into v_title from public.projects where id = v_c.project_id;
  perform public._notify(case when v_c.creator_id = v_uid then v_c.admin_id else v_c.creator_id end,
                         'contract_cancelled', '/contracts/' || p_contract::text,
                         '「' || v_title || '」 계약이 취소되었어요');
end;
$$;

-- 운영자: 체결된 계약의 결제 주문을 저장한다. 실패했던 주문이 있으면 새 주문번호로 다시 준비한다.
create or replace function public.create_payment_order(p_contract uuid) returns table (order_id text, amount_won integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.contracts%rowtype;
  v_p public.payments%rowtype;
  v_order text := 'ark_' || replace(gen_random_uuid()::text, '-', '');
begin
  if (select auth.uid()) is null then
    raise exception 'not_logged_in' using errcode = '28000';
  end if;
  if not (select public.is_admin()) or not (select public.is_email_confirmed()) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  select * into v_c from public.contracts where id = p_contract for update;
  if not found or v_c.status <> 'active' then
    raise exception 'contract_not_active';
  end if;
  select * into v_p from public.payments p where p.contract_id = p_contract for update;
  if found then
    if v_p.status in ('paid', 'paid_out') then
      raise exception 'already_paid';
    end if;
    update public.payments p
       set order_id = v_order, amount_won = v_c.amount_won, status = 'ready', fail_code = null
     where p.id = v_p.id;
  else
    insert into public.payments (contract_id, order_id, amount_won) values (p_contract, v_order, v_c.amount_won);
  end if;
  return query select v_order, v_c.amount_won;
end;
$$;

-- 운영자(서버): 토스 승인 API가 성공한 뒤 부른다. 저장 금액과 다르면 막는다.
create or replace function public.mark_payment_paid(p_order text, p_payment_key text, p_amount_won integer) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p public.payments%rowtype;
  v_c public.contracts%rowtype;
  v_title text;
begin
  if not (select public.is_admin()) or not (select public.is_email_confirmed()) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  select * into v_p from public.payments where order_id = p_order for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  if v_p.status <> 'ready' then
    raise exception 'order_not_ready';
  end if;
  if p_amount_won is distinct from v_p.amount_won then
    raise exception 'amount_mismatch';
  end if;
  if p_payment_key is null or char_length(p_payment_key) not between 1 and 200 then
    raise exception 'payment_key_invalid';
  end if;
  update public.payments set status = 'paid', payment_key = p_payment_key, approved_at = now() where id = v_p.id;
  select * into v_c from public.contracts where id = v_p.contract_id;
  select title into v_title from public.projects where id = v_c.project_id;
  perform public._notify(v_c.creator_id, 'payment_paid', '/contracts/' || v_c.id::text,
                         '「' || v_title || '」 대금이 결제되어 보관 중이에요. 작업을 시작해 주세요');
  return v_c.id;
end;
$$;

-- 운영자(서버): 토스 결제·승인이 실패하면 부른다.
create or replace function public.mark_payment_failed(p_order text, p_code text) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_admin()) or not (select public.is_email_confirmed()) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  update public.payments
     set status = 'failed', fail_code = left(regexp_replace(coalesce(p_code, 'UNKNOWN'), '[^A-Za-z0-9_]', '', 'g'), 60)
   where order_id = p_order and status = 'ready';
end;
$$;

-- 크리에이터: 결제된 계약의 납품을 요청한다.
create or replace function public.request_delivery(p_contract uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.contracts%rowtype;
  v_title text;
begin
  select * into v_c from public.contracts where id = p_contract;
  if not found or v_c.creator_id is distinct from (select auth.uid()) then
    raise exception 'contract_not_found';
  end if;
  update public.payments set delivered_at = now()
   where contract_id = p_contract and status = 'paid' and delivered_at is null;
  if not found then
    raise exception 'delivery_not_allowed';
  end if;
  select title into v_title from public.projects where id = v_c.project_id;
  perform public._notify(v_c.admin_id, 'delivery_requested', '/contracts/' || p_contract::text,
                         '「' || v_title || '」 납품 요청이 왔어요. 확인 뒤 완료를 승인해 주세요');
end;
$$;

-- 운영자: 납품을 확인하고 완료를 승인한다. 수수료와 정산액을 기록한다(실제 이체 없음).
create or replace function public.approve_completion(p_contract uuid) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.contracts%rowtype;
  v_p public.payments%rowtype;
  v_title text;
begin
  if not (select public.is_admin()) or not (select public.is_email_confirmed()) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  select * into v_c from public.contracts where id = p_contract for update;
  if not found or v_c.status <> 'active' then
    raise exception 'contract_not_active';
  end if;
  select * into v_p from public.payments where contract_id = p_contract for update;
  if not found or v_p.status <> 'paid' or v_p.delivered_at is null then
    raise exception 'completion_not_allowed';
  end if;
  update public.payments
     set status = 'paid_out', completed_at = now(), fee_won = v_p.amount_won / 10, payout_won = v_p.amount_won - v_p.amount_won / 10
   where id = v_p.id;
  update public.contracts set status = 'completed', closed_at = now() where id = p_contract;
  select title into v_title from public.projects where id = v_c.project_id;
  perform public._notify(v_c.creator_id, 'work_completed', '/contracts/' || p_contract::text,
                         '「' || v_title || '」 완료가 승인되어 ' || to_char(v_p.amount_won - v_p.amount_won / 10, 'FM999,999,999,999') || '원 정산이 기록되었어요');
  return v_p.amount_won - v_p.amount_won / 10;
end;
$$;

revoke all on function public.accept_with_offer(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.respond_offer(uuid, boolean) from public, anon, authenticated;
revoke all on function public.sign_contract(uuid) from public, anon, authenticated;
revoke all on function public.cancel_contract(uuid) from public, anon, authenticated;
revoke all on function public.create_payment_order(uuid) from public, anon, authenticated;
revoke all on function public.mark_payment_paid(text, text, integer) from public, anon, authenticated;
revoke all on function public.mark_payment_failed(text, text) from public, anon, authenticated;
revoke all on function public.request_delivery(uuid) from public, anon, authenticated;
revoke all on function public.approve_completion(uuid) from public, anon, authenticated;
grant execute on function public.accept_with_offer(uuid, integer, integer) to authenticated;
grant execute on function public.respond_offer(uuid, boolean) to authenticated;
grant execute on function public.sign_contract(uuid) to authenticated;
grant execute on function public.cancel_contract(uuid) to authenticated;
grant execute on function public.create_payment_order(uuid) to authenticated;
grant execute on function public.mark_payment_paid(text, text, integer) to authenticated;
grant execute on function public.mark_payment_failed(text, text) to authenticated;
grant execute on function public.request_delivery(uuid) to authenticated;
grant execute on function public.approve_completion(uuid) to authenticated;
