-- 「납품 요청」「완료 승인」 말을 「납품하기」「납품 확인하고 정산하기」로 바꾼다(알림 문구만 바뀐다. 처리 내용·상태 값은 0035와 같다).
-- 0035의 request_delivery·approve_completion을 같은 본문에 알림 문구만 바꿔 다시 만든다.
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
                         '「' || v_title || '」 납품이 왔어요. 확인하고 정산해 주세요');
end;
$$;

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
                         '「' || v_title || '」 정산 ' || to_char(v_p.amount_won - v_p.amount_won / 10, 'FM999,999,999,999') || '원이 기록되고 계약이 끝났어요');
  return v_p.amount_won - v_p.amount_won / 10;
end;
$$;

revoke all on function public.request_delivery(uuid) from public, anon, authenticated;
revoke all on function public.approve_completion(uuid) from public, anon, authenticated;
grant execute on function public.request_delivery(uuid) to authenticated;
grant execute on function public.approve_completion(uuid) to authenticated;
