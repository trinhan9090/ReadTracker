-- ReadSession 0.5: per-record compare-and-set operations over the existing library.
-- Apply after upgrade-0.4.sql. Existing library payloads/revisions are preserved.
begin;
create table if not exists public.rs_sync_clients(owner uuid primary key references auth.users(id) on delete cascade, protocol integer not null default 5);
create table if not exists public.rs_sync_receipts(owner uuid not null references auth.users(id) on delete cascade, op_id text not null, fingerprint text not null, created_at timestamptz not null default now(), primary key(owner,op_id));
alter table public.rs_sync_clients enable row level security;
alter table public.rs_sync_receipts enable row level security;
revoke all on public.rs_sync_clients,public.rs_sync_receipts from public,anon,authenticated;
-- Preserve the tested snapshot writer as an internal implementation only.
do $$ begin
 if to_regprocedure('public.rs_sync_snapshot_internal(integer,jsonb)') is null then
  alter function public.rs_sync(integer,jsonb) rename to rs_sync_snapshot_internal;
 end if;
end $$;
revoke all on function public.rs_sync_snapshot_internal(integer,jsonb) from public,anon,authenticated;
create or replace function public.rs_sync(expected_revision integer,snapshot jsonb)
returns integer language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.rs_libraries where owner=auth.uid() for update;
 if exists(select 1 from public.rs_sync_clients where owner=auth.uid() and protocol>=5) then raise exception 'RS_UPGRADE_REQUIRED'; end if;
 return public.rs_sync_snapshot_internal(expected_revision,snapshot);
end $$;
revoke all on function public.rs_sync(integer,jsonb) from public,anon;
grant execute on function public.rs_sync(integer,jsonb) to authenticated;

create or replace function public.rs_apply_ops(expected_owner uuid,operations jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); s jsonb; original jsonb; rev integer; op jsonb; kind text; rid text; current_value jsonb; desired jsonb; baseline jsonb; receipt text; accepted jsonb:='[]'; conflicts jsonb:='[]'; reason text;
begin
 if uid is null or uid is distinct from expected_owner then raise exception 'RS_ACCOUNT_CHANGED'; end if;
 if jsonb_typeof(operations) is distinct from 'array' or jsonb_array_length(operations)>50 or octet_length(operations::text)>12000000 then raise exception 'Invalid operations'; end if;
 insert into public.rs_profiles(id,name) values(uid,'Reader') on conflict do nothing;
 insert into public.rs_libraries(owner) values(uid) on conflict do nothing;
 select payload,revision into s,rev from public.rs_libraries where owner=uid for update;
 original:=s;
 if s->>'version' is distinct from '1' then s:='{"version":1,"books":[],"sessions":[],"draft":null,"settings":{"language":"vi","theme":"system"}}'; end if;
 for op in select value from jsonb_array_elements(operations) loop
  kind:=op->>'kind'; rid:=op->>'id'; desired:=coalesce(op->'value','null'::jsonb); baseline:=coalesce(op->'base','null'::jsonb); reason:=null;
  if kind not in ('books','sessions','settings') or kind is null or coalesce(length(rid),0)=0 or coalesce(length(op->>'opId'),0) not between 8 and 128 then raise exception 'Invalid operation'; end if;
  select fingerprint into receipt from public.rs_sync_receipts where owner=uid and op_id=op->>'opId';
  if found then
   if receipt<>md5(op::text) then raise exception 'RS_OPERATION_REUSED'; end if;
   accepted:=accepted||jsonb_build_array(op->>'opId'); continue;
  end if;
  if kind='settings' then current_value:=s->'settings';
  else select value into current_value from jsonb_array_elements(s->kind) where value->>'id'=rid; end if;
  current_value:=coalesce(current_value,'null'::jsonb);
  if current_value is distinct from baseline and current_value is distinct from desired then reason:='CHANGED'; end if;
  if desired<>'null'::jsonb then
   if jsonb_typeof(desired)<>'object' then raise exception 'Invalid record'; end if;
   if kind<>'settings' and desired->>'id' is distinct from rid then raise exception 'Record ID mismatch'; end if;
   if kind='books' and (jsonb_typeof(desired->'title') is distinct from 'string' or jsonb_typeof(desired->'author') is distinct from 'string' or not ((desired->>'total')::integer between 1 and 999999) or not ((desired->>'position')::integer between 0 and (desired->>'total')::integer)) then raise exception 'Invalid book'; end if;
   if kind='sessions' and not exists(select 1 from jsonb_array_elements(s->'books') b where b->>'id'=desired->>'bookId' and (coalesce(b->>'deletedAt','')='' or coalesce(desired->>'deletedAt','')<>'')) then reason:='BOOK_UNAVAILABLE'; end if;
   if kind='sessions' and (jsonb_typeof(desired->'seconds') is distinct from 'number' or (desired->>'seconds')::numeric<0 or (desired->>'seconds')::numeric<>trunc((desired->>'seconds')::numeric)) then raise exception 'Invalid duration'; end if;
  elsif kind='settings' then raise exception 'Cannot delete settings';
  end if;
  if reason is not null then conflicts:=conflicts||jsonb_build_array(jsonb_build_object('kind',kind,'id',rid,'remote',current_value,'reason',reason)); continue; end if;
  if kind='settings' then s:=jsonb_set(s,'{settings}',desired);
  else
   s:=jsonb_set(s,array[kind],coalesce((select jsonb_agg(value) from jsonb_array_elements(s->kind) where value->>'id'<>rid),'[]'::jsonb)||case when desired='null'::jsonb then '[]'::jsonb else jsonb_build_array(desired) end);
   -- Permanent removal of a book also removes its sessions in the same transaction.
   if kind='books' and desired='null'::jsonb then s:=jsonb_set(s,'{sessions}',coalesce((select jsonb_agg(value) from jsonb_array_elements(s->'sessions') where value->>'bookId'<>rid),'[]'::jsonb)); end if;
  end if;
  insert into public.rs_sync_receipts(owner,op_id,fingerprint) values(uid,op->>'opId',md5(op::text));
  accepted:=accepted||jsonb_build_array(op->>'opId');
 end loop;
 if s is distinct from original then rev:=public.rs_sync_snapshot_internal(rev,s); end if;
 -- Activate only for accounts using this protocol, preserving untouched 0.4 accounts.
 insert into public.rs_sync_clients(owner,protocol) values(uid,5) on conflict(owner) do update set protocol=5;
 return jsonb_build_object('library',s,'revision',rev,'accepted',accepted,'conflicts',conflicts);
end $$;
revoke all on function public.rs_apply_ops(uuid,jsonb) from public,anon;
grant execute on function public.rs_apply_ops(uuid,jsonb) to authenticated;
commit;
