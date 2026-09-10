-- ReadSession demo. Public means visible to signed-in demo members.
begin;
create table if not exists public.rs_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 80),
 avatar text check (avatar is null or (avatar like 'data:image/jpeg;base64,%' and octet_length(avatar) < 350000)),
 featured text[] not null default '{}' check (cardinality(featured) <= 3)
);
create table if not exists public.rs_libraries (
 owner uuid primary key references auth.users(id) on delete cascade,
 revision integer not null default 0,
 payload jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
create table if not exists public.rs_books (
 owner uuid not null references public.rs_profiles(id) on delete cascade,
 id text not null, title text not null, author text not null,
 total integer not null, position integer not null, completed boolean not null,
 cover text, isbn text, reflection text not null default '',
 primary key(owner,id)
);
create table if not exists public.rs_notes (
 owner uuid not null, id text not null, book_id text not null,
 note text not null, date text not null,
 primary key(owner,id),
 foreign key(owner,book_id) references public.rs_books(owner,id) on delete cascade
);
create table if not exists public.rs_friends (
 sender uuid not null references public.rs_profiles(id) on delete cascade,
 recipient uuid not null references public.rs_profiles(id) on delete cascade,
 accepted boolean not null default false,
 primary key(sender,recipient), check(sender <> recipient)
);
create unique index if not exists rs_friend_pair on public.rs_friends(least(sender,recipient),greatest(sender,recipient));
alter table public.rs_profiles enable row level security;
alter table public.rs_libraries enable row level security;
alter table public.rs_books enable row level security;
alter table public.rs_notes enable row level security;
alter table public.rs_friends enable row level security;
revoke all on public.rs_profiles,public.rs_libraries,public.rs_books,public.rs_notes,public.rs_friends from anon,authenticated;
grant select on public.rs_profiles,public.rs_libraries,public.rs_books,public.rs_notes,public.rs_friends to authenticated;
grant insert,update on public.rs_profiles to authenticated;
grant insert,delete on public.rs_friends to authenticated;
grant update(accepted) on public.rs_friends to authenticated;
create policy profiles_read on public.rs_profiles for select to authenticated using (true);
create policy profiles_insert on public.rs_profiles for insert to authenticated with check(id=auth.uid());
create policy profiles_update on public.rs_profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy library_owner on public.rs_libraries for select to authenticated using(owner=auth.uid());
create policy books_public on public.rs_books for select to authenticated using(true);
create policy notes_public on public.rs_notes for select to authenticated using(true);
create policy friends_read on public.rs_friends for select to authenticated using(auth.uid() in (sender,recipient));
create policy friends_insert on public.rs_friends for insert to authenticated with check(sender=auth.uid() and not accepted);
create policy friends_accept on public.rs_friends for update to authenticated using(recipient=auth.uid()) with check(recipient=auth.uid() and accepted);
create policy friends_delete on public.rs_friends for delete to authenticated using(auth.uid() in (sender,recipient));

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
 return current_revision+1;
end $$;
revoke all on function public.rs_sync(integer,jsonb) from public,anon;
grant execute on function public.rs_sync(integer,jsonb) to authenticated;
commit;
