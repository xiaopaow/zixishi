create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 28),
  tier text not null default 'free' check (tier in ('free', 'plus')),
  role text not null default 'member' check (role in ('member', 'admin')),
  membership_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select (
  id,
  display_name,
  tier,
  role,
  membership_expires_at,
  created_at,
  updated_at
) on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

drop policy if exists "members can read own profile" on public.profiles;
create policy "members can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "members can update own display name" on public.profiles;
create policy "members can update own display name"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create table if not exists private.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_prefix text not null,
  note text,
  max_uses integer not null default 1 check (max_uses between 1 and 1000),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (used_count <= max_uses)
);

create table if not exists private.invite_redemptions (
  invite_id uuid not null references private.invite_codes(id) on delete restrict,
  user_id uuid primary key references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (invite_id, user_id)
);

create or replace function private.normalized_invite_hash(code text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select encode(
    extensions.digest(upper(trim(code)), 'sha256'),
    'hex'
  )
$$;

create or replace function private.is_qishi_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
$$;

revoke execute on function private.normalized_invite_hash(text) from public, anon, authenticated;
revoke execute on function private.is_qishi_admin() from public, anon, authenticated;

create or replace function public.hook_require_qishi_invite(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_code text;
  invite_exists boolean;
begin
  invite_code := event->'user'->'user_metadata'->>'invite_code';

  if invite_code is null or invite_code !~ '^[A-Za-z0-9-]{6,24}$' then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', '需要有效的栖时内测邀请码'
      )
    );
  end if;

  select exists (
    select 1
    from private.invite_codes
    where code_hash = private.normalized_invite_hash(invite_code)
      and active
      and used_count < max_uses
      and (expires_at is null or expires_at > now())
  ) into invite_exists;

  if not invite_exists then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', '邀请码无效、已用完或已过期'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_require_qishi_invite(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
revoke execute on function public.hook_require_qishi_invite(jsonb)
from public, anon, authenticated;

create or replace function public.handle_qishi_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_code text;
  redeemed_invite_id uuid;
  requested_name text;
begin
  invite_code := new.raw_user_meta_data->>'invite_code';
  requested_name := nullif(trim(new.raw_user_meta_data->>'display_name'), '');

  update private.invite_codes
  set used_count = used_count + 1
  where code_hash = private.normalized_invite_hash(invite_code)
    and active
    and used_count < max_uses
    and (expires_at is null or expires_at > now())
  returning id into redeemed_invite_id;

  if redeemed_invite_id is null then
    raise exception using
      errcode = 'P0001',
      message = '邀请码已失效，请联系栖时主理人';
  end if;

  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(requested_name, split_part(coalesce(new.email, '栖友'), '@', 1), '栖友'),
      28
    )
  );

  insert into private.invite_redemptions (invite_id, user_id)
  values (redeemed_invite_id, new.id);

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'invite_code'
  where id = new.id;

  return new;
end;
$$;

revoke execute on function public.handle_qishi_user_created()
from public, anon, authenticated;

drop trigger if exists on_qishi_user_created on auth.users;
create trigger on_qishi_user_created
after insert on auth.users
for each row execute procedure public.handle_qishi_user_created();

create or replace function public.admin_create_invite(
  code text,
  max_uses integer default 1,
  expires_at timestamptz default null,
  note text default null
)
returns table (
  id uuid,
  code_prefix text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_qishi_admin() then
    raise exception using errcode = '42501', message = '仅管理员可以创建邀请码';
  end if;

  if code !~ '^[A-Za-z0-9-]{6,24}$' then
    raise exception using errcode = '22023', message = '邀请码须为 6 至 24 位字母、数字或连字符';
  end if;

  if max_uses < 1 or max_uses > 1000 then
    raise exception using errcode = '22023', message = '可用次数须为 1 至 1000';
  end if;

  return query
  insert into private.invite_codes (
    code_hash,
    code_prefix,
    note,
    max_uses,
    expires_at,
    created_by
  )
  values (
    private.normalized_invite_hash(code),
    left(upper(trim(code)), 6),
    nullif(trim(note), ''),
    max_uses,
    expires_at,
    (select auth.uid())
  )
  returning
    invite_codes.id,
    invite_codes.code_prefix,
    invite_codes.created_at;
end;
$$;

create or replace function public.admin_list_invites()
returns table (
  id uuid,
  code_prefix text,
  note text,
  max_uses integer,
  used_count integer,
  expires_at timestamptz,
  active boolean,
  created_at timestamptz,
  revoked_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_qishi_admin() then
    raise exception using errcode = '42501', message = '仅管理员可以查看邀请码';
  end if;

  return query
  select
    invite_codes.id,
    invite_codes.code_prefix,
    invite_codes.note,
    invite_codes.max_uses,
    invite_codes.used_count,
    invite_codes.expires_at,
    invite_codes.active,
    invite_codes.created_at,
    invite_codes.revoked_at
  from private.invite_codes
  order by invite_codes.created_at desc;
end;
$$;

create or replace function public.admin_revoke_invite(invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if not private.is_qishi_admin() then
    raise exception using errcode = '42501', message = '仅管理员可以停用邀请码';
  end if;

  update private.invite_codes
  set active = false, revoked_at = coalesce(revoked_at, now())
  where id = invite_id and active;

  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

grant execute on function public.admin_create_invite(text, integer, timestamptz, text)
to authenticated;
grant execute on function public.admin_list_invites()
to authenticated;
grant execute on function public.admin_revoke_invite(uuid)
to authenticated;

revoke execute on function public.admin_create_invite(text, integer, timestamptz, text)
from public, anon;
revoke execute on function public.admin_list_invites()
from public, anon;
revoke execute on function public.admin_revoke_invite(uuid)
from public, anon;

create or replace function private.bootstrap_first_invite(
  code text,
  expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_id uuid;
begin
  if exists (select 1 from private.invite_codes) then
    raise exception '邀请码表已经初始化';
  end if;

  if code !~ '^[A-Za-z0-9-]{6,24}$' then
    raise exception '邀请码须为 6 至 24 位字母、数字或连字符';
  end if;

  insert into private.invite_codes (
    code_hash,
    code_prefix,
    note,
    max_uses,
    expires_at
  )
  values (
    private.normalized_invite_hash(code),
    left(upper(trim(code)), 6),
    '首位管理员初始化邀请码',
    1,
    expires_at
  )
  returning id into invite_id;

  return invite_id;
end;
$$;

revoke execute on function private.bootstrap_first_invite(text, timestamptz)
from public, anon, authenticated;

drop policy if exists "qishi members can read scene presence" on realtime.messages;
create policy "qishi members can read scene presence"
on realtime.messages
for select
to authenticated
using (
  (select realtime.topic()) = 'qishi:scene-presence'
  and realtime.messages.extension = 'presence'
);

drop policy if exists "qishi members can track scene presence" on realtime.messages;
create policy "qishi members can track scene presence"
on realtime.messages
for insert
to authenticated
with check (
  (select realtime.topic()) = 'qishi:scene-presence'
  and realtime.messages.extension = 'presence'
);
