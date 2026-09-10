-- ReadSession 0.4. Apply after schema.sql. No private library is deleted.
begin;
create table if not exists public.rs_public_sessions (
 owner uuid not null, id text not null, book_id text not null,
 date text not null, seconds bigint not null check(seconds >= 0),
 start_page integer not null, end_page integer not null, note text not null default '',
 primary key(owner,id),
 foreign key(owner,book_id) references public.rs_books(owner,id) on delete cascade
);
create table if not exists public.rs_reading_totals (
 owner uuid primary key references public.rs_profiles(id) on delete cascade,
 seconds bigint not null default 0 check(seconds >= 0)
);
alter table public.rs_public_sessions enable row level security;
alter table public.rs_reading_totals enable row level security;
revoke all on public.rs_public_sessions,public.rs_reading_totals from anon,authenticated;
grant select on public.rs_public_sessions,public.rs_reading_totals to authenticated;
drop policy if exists sessions_public on public.rs_public_sessions;
create policy sessions_public on public.rs_public_sessions for select to authenticated using(true);
drop policy if exists totals_public on public.rs_reading_totals;
create policy totals_public on public.rs_reading_totals for select to authenticated using(true);

-- This helper is callable only by the owner of the sync function, never clients.
create or replace function public.rs_refresh_reading(uid uuid, snapshot jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare n jsonb; total_seconds bigint := 0;
begin
 delete from public.rs_public_sessions where owner=uid;
 for n in select value from jsonb_array_elements(snapshot->'sessions') loop
  if coalesce(n->>'deletedAt','')='' and exists(
   select 1 from jsonb_array_elements(snapshot->'books') b
   where b->>'id'=n->>'bookId' and coalesce(b->>'deletedAt','')=''
  ) then
   total_seconds := total_seconds + greatest(0,coalesce((n->>'seconds')::bigint,0));
   if exists(select 1 from public.rs_books where owner=uid and id=n->>'bookId') then
    insert into public.rs_public_sessions(owner,id,book_id,date,seconds,start_page,end_page,note)
    values(uid,n->>'id',n->>'bookId',n->>'date',greatest(0,coalesce((n->>'seconds')::bigint,0)),
     (n->>'start')::integer,(n->>'end')::integer,
     case when n->>'visibility'='public' then left(coalesce(n->>'note',''),20000) else '' end);
   end if;
  end if;
 end loop;
 insert into public.rs_reading_totals(owner,seconds) values(uid,total_seconds)
 on conflict(owner) do update set seconds=excluded.seconds;
end $$;
revoke all on function public.rs_refresh_reading(uuid,jsonb) from public,anon,authenticated;

create or replace function public.rs_sync(expected_revision integer, snapshot jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); current_revision integer; b jsonb; n jsonb;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if snapshot->>'version' <> '1' or jsonb_typeof(snapshot->'books') is distinct from 'array'
 or jsonb_typeof(snapshot->'sessions') is distinct from 'array' or octet_length(snapshot::text)>12000000
 then raise exception 'Invalid library'; end if;
 insert into public.rs_profiles(id,name) values(uid,'Reader') on conflict do nothing;
 insert into public.rs_libraries(owner) values(uid) on conflict do nothing;
 select revision into current_revision from public.rs_libraries where owner=uid for update;
 if current_revision <> expected_revision then raise exception 'RS_CONFLICT'; end if;
 update public.rs_libraries set payload=snapshot,revision=revision+1,updated_at=now() where owner=uid;
 delete from public.rs_books where owner=uid;
 for b in select value from jsonb_array_elements(snapshot->'books') loop
  if b->>'visibility'='public' and coalesce(b->>'deletedAt','')='' then
   insert into public.rs_books(owner,id,title,author,total,position,completed,cover,isbn,reflection)
   values(uid,b->>'id',left(b->>'title',1000),left(b->>'author',1000),(b->>'total')::integer,(b->>'position')::integer,(b->>'completed')::boolean,
    case when octet_length(b->>'cover')<350000 then b->>'cover' end,b->>'isbn',
    case when b->>'reflectionVisibility'='public' then left(coalesce(b->>'reflection',''),20000) else '' end);
  end if;
 end loop;
 for n in select value from jsonb_array_elements(snapshot->'sessions') loop
  if n->>'visibility'='public' and coalesce(n->>'deletedAt','')='' and exists(select 1 from public.rs_books where owner=uid and id=n->>'bookId') then
   insert into public.rs_notes(owner,id,book_id,note,date) values(uid,n->>'id',n->>'bookId',left(coalesce(n->>'note',''),20000),n->>'date');
  end if;
 end loop;
 perform public.rs_refresh_reading(uid,snapshot);
 return current_revision+1;
end $$;
revoke all on function public.rs_sync(integer,jsonb) from public,anon;
grant execute on function public.rs_sync(integer,jsonb) to authenticated;
-- Populate the new projection from existing snapshots, without changing revisions.
do $$ declare library record; begin
 for library in select owner,payload from public.rs_libraries where payload->>'version'='1' loop
  perform public.rs_refresh_reading(library.owner,library.payload);
 end loop;
end $$;

-- Prevent an upload begun before account switching from targeting the new account.
create or replace function public.rs_sync_for_owner(expected_owner uuid, expected_revision integer, snapshot jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or auth.uid() is distinct from expected_owner then raise exception 'RS_ACCOUNT_CHANGED'; end if;
 return public.rs_sync(expected_revision,snapshot);
end $$;
revoke all on function public.rs_sync_for_owner(uuid,integer,jsonb) from public,anon;
grant execute on function public.rs_sync_for_owner(uuid,integer,jsonb) to authenticated;
commit;
