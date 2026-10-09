-- VoiceMento Cloud v1. Run in the SQL Editor of a dedicated Supabase project.
-- Private media bucket + owner-only review + blind guest submissions.
-- A guest QR invite code grants submission only, NEVER gallery access.

create schema if not exists voicemento_private;

create table if not exists public.voicemento_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 120),
  guest_code uuid not null default gen_random_uuid() unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.voicemento_memories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.voicemento_events(id) on delete cascade,
  guest_code uuid not null,
  guest_name text not null default 'Guest' check (char_length(guest_name) between 1 and 140),
  kind text not null check (kind in ('audio','video','photo','note')),
  duration_seconds int not null default 0 check (duration_seconds between 0 and 180),
  note text check (char_length(note) <= 1200),
  media_path text,
  photo_path text,
  approved boolean not null default false,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  constraint voicemento_memory_requires_content check (note is not null or media_path is not null)
);

create index if not exists voicemento_memories_event_date_idx
  on public.voicemento_memories(event_id, created_at desc);

alter table public.voicemento_events enable row level security;
alter table public.voicemento_memories enable row level security;

-- Only signed-in event owners can administer events.
drop policy if exists vm_events_owner on public.voicemento_events;
create policy vm_events_owner on public.voicemento_events
  for all to authenticated
  using (owner_id = (select auth.uid()) and coalesce(auth.jwt()->>'is_anonymous','false') <> 'true')
  with check (owner_id = (select auth.uid()) and coalesce(auth.jwt()->>'is_anonymous','false') <> 'true');

-- A small narrowly scoped SECURITY DEFINER checker runs in an unexposed schema.
-- An anonymous user cannot query the events table or enumerate invitations.
create or replace function voicemento_private.guest_invite_valid(p_event text,p_code text)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.voicemento_events
    where id::text = p_event
      and guest_code::text = p_code
      and active = true
  );
$$;
revoke all on function voicemento_private.guest_invite_valid(text,text) from public;
grant usage on schema voicemento_private to anon,authenticated;
grant execute on function voicemento_private.guest_invite_valid(text,text) to anon,authenticated;

drop policy if exists vm_memories_guest_submit on public.voicemento_memories;
create policy vm_memories_guest_submit on public.voicemento_memories
  for insert to anon,authenticated
  with check (
    voicemento_private.guest_invite_valid(event_id::text,guest_code::text)
    and approved=false and favorite=false
    and (media_path is null or media_path like event_id::text || '/' || guest_code::text || '/%')
    and (photo_path is null or photo_path like event_id::text || '/' || guest_code::text || '/%')
  );

drop policy if exists vm_memories_owner_read on public.voicemento_memories;
create policy vm_memories_owner_read on public.voicemento_memories
  for select to authenticated
  using (exists (
    select 1 from public.voicemento_events e
    where e.id = event_id and e.owner_id = (select auth.uid())
  ));

drop policy if exists vm_memories_owner_update on public.voicemento_memories;
create policy vm_memories_owner_update on public.voicemento_memories
  for update to authenticated
  using (exists (
    select 1 from public.voicemento_events e
    where e.id = event_id and e.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.voicemento_events e
    where e.id = event_id and e.owner_id = (select auth.uid())
  ));

grant select,insert,update on public.voicemento_events to authenticated;
grant select,insert,update on public.voicemento_memories to authenticated;
grant insert on public.voicemento_memories to anon;

-- Private means recordings can only be retrieved by authorized event owners.
insert into storage.buckets(id,name,public,file_size_limit)
values ('voicemento-private','voicemento-private',false,52428800)
on conflict (id) do nothing;

drop policy if exists vm_storage_guest_upload on storage.objects;
create policy vm_storage_guest_upload on storage.objects
  for insert to anon,authenticated
  with check (
    bucket_id = 'voicemento-private'
    and array_length(storage.foldername(name),1) = 2
    and voicemento_private.guest_invite_valid(
      (storage.foldername(name))[1],(storage.foldername(name))[2]
    )
  );

drop policy if exists vm_storage_owner_read on storage.objects;
create policy vm_storage_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'voicemento-private'
    and exists (
      select 1 from public.voicemento_events e
      where e.id::text = (storage.foldername(name))[1]
        and e.owner_id = (select auth.uid())
    )
  );

-- No DELETE, UPDATE, or guest SELECT policies: no overwrites or guest access.
-- For production: enable rate limiting and bot protection upstream.
