-- NeoKIM Webtoon Studio auth, acorn, and project schema for Supabase.
-- Run this in the Supabase SQL Editor after enabling Google Auth.
-- Project target: GitHub Pages static frontend + Supabase Auth/Postgres/RPC.

create extension if not exists pgcrypto;

create table if not exists public.webtoon_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  provider_email text,
  acorns integer not null default 0 check (acorns >= 0),
  guide_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webtoon_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- After your first Google login, run this once in Supabase SQL Editor:
-- insert into public.webtoon_admins (user_id)
-- select id from auth.users where email = 'YOUR_GOOGLE_EMAIL@example.com'
-- on conflict do nothing;

create table if not exists public.webtoon_acorn_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null check (delta <> 0),
  balance_after integer not null check (balance_after >= 0),
  reason text not null check (
    reason in (
      'signup_bonus',
      'daily_claim',
      'draft_generation',
      'panel_regenerate',
      'admin_adjust'
    )
  ),
  ref_type text,
  ref_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_webtoon_acorn_ledger_user_created
  on public.webtoon_acorn_ledger (user_id, created_at desc);

create table if not exists public.webtoon_daily_acorn_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_date date not null default current_date,
  amount integer not null default 5 check (amount > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, claim_date)
);

create table if not exists public.webtoon_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Awakening Intro',
  idea text not null default '',
  genre text not null default 'modern-awakening'
    check (genre in ('modern-awakening')),
  panels jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'archived', 'published')),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_webtoon_projects_user_updated
  on public.webtoon_projects (user_id, updated_at desc);

create table if not exists public.webtoon_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.webtoon_projects(id) on delete set null,
  job_type text not null check (
    job_type in ('draft_generation', 'panel_regenerate')
  ),
  scenario_key text not null default 'awakening-subway-gate',
  cost integer not null default 0 check (cost >= 0),
  status text not null default 'ready'
    check (status in ('ready', 'running', 'done', 'failed')),
  progress integer not null default 0 check (progress between 0 and 100),
  request_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.webtoon_projects
  drop constraint if exists webtoon_projects_title_length;
alter table public.webtoon_projects
  add constraint webtoon_projects_title_length
  check (char_length(title) between 1 and 60);

alter table public.webtoon_projects
  drop constraint if exists webtoon_projects_idea_length;
alter table public.webtoon_projects
  add constraint webtoon_projects_idea_length
  check (char_length(idea) <= 3000);

alter table public.webtoon_projects
  drop constraint if exists webtoon_projects_panel_limit;
alter table public.webtoon_projects
  add constraint webtoon_projects_panel_limit
  check (
    case
      when jsonb_typeof(panels) = 'array' then jsonb_array_length(panels) <= 20
      else false
    end
  );

alter table public.webtoon_generation_jobs
  drop constraint if exists webtoon_jobs_scenario_length;
alter table public.webtoon_generation_jobs
  add constraint webtoon_jobs_scenario_length
  check (char_length(scenario_key) <= 100);

alter table public.webtoon_generation_jobs
  drop constraint if exists webtoon_jobs_request_size;
alter table public.webtoon_generation_jobs
  add constraint webtoon_jobs_request_size
  check (octet_length(request_payload::text) <= 65536);

alter table public.webtoon_generation_jobs
  drop constraint if exists webtoon_jobs_result_size;
alter table public.webtoon_generation_jobs
  add constraint webtoon_jobs_result_size
  check (octet_length(result_payload::text) <= 131072);

alter table public.webtoon_generation_jobs
  drop constraint if exists webtoon_jobs_error_length;
alter table public.webtoon_generation_jobs
  add constraint webtoon_jobs_error_length
  check (error_message is null or char_length(error_message) <= 1000);

create index if not exists idx_webtoon_generation_jobs_user_created
  on public.webtoon_generation_jobs (user_id, created_at desc);

alter table public.webtoon_profiles enable row level security;
alter table public.webtoon_admins enable row level security;
alter table public.webtoon_acorn_ledger enable row level security;
alter table public.webtoon_daily_acorn_claims enable row level security;
alter table public.webtoon_projects enable row level security;
alter table public.webtoon_generation_jobs enable row level security;

revoke all on public.webtoon_profiles from anon, authenticated;
revoke all on public.webtoon_admins from anon, authenticated;
revoke all on public.webtoon_acorn_ledger from anon, authenticated;
revoke all on public.webtoon_daily_acorn_claims from anon, authenticated;
revoke all on public.webtoon_projects from anon, authenticated;
revoke all on public.webtoon_generation_jobs from anon, authenticated;

grant select on public.webtoon_profiles to authenticated;
grant select on public.webtoon_admins to authenticated;
grant select on public.webtoon_acorn_ledger to authenticated;
grant select on public.webtoon_daily_acorn_claims to authenticated;
grant select on public.webtoon_projects to anon, authenticated;
grant insert, update, delete on public.webtoon_projects to authenticated;
grant select on public.webtoon_generation_jobs to authenticated;

create or replace function public.webtoon_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.webtoon_admins
     where user_id = auth.uid()
  );
$$;

drop policy if exists webtoon_profiles_select_own on public.webtoon_profiles;
create policy webtoon_profiles_select_own
  on public.webtoon_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists webtoon_admins_select_own on public.webtoon_admins;
create policy webtoon_admins_select_own
  on public.webtoon_admins
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists webtoon_acorn_ledger_select_own on public.webtoon_acorn_ledger;
create policy webtoon_acorn_ledger_select_own
  on public.webtoon_acorn_ledger
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists webtoon_daily_claims_select_own on public.webtoon_daily_acorn_claims;
create policy webtoon_daily_claims_select_own
  on public.webtoon_daily_acorn_claims
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists webtoon_projects_select_own_or_public on public.webtoon_projects;
drop policy if exists webtoon_projects_select_public_or_admin on public.webtoon_projects;
create policy webtoon_projects_select_public_or_admin
  on public.webtoon_projects
  for select
  to anon, authenticated
  using ((is_public = true and status = 'published') or public.webtoon_is_admin());

drop policy if exists webtoon_projects_insert_own on public.webtoon_projects;
drop policy if exists webtoon_projects_insert_admin on public.webtoon_projects;
create policy webtoon_projects_insert_admin
  on public.webtoon_projects
  for insert
  to authenticated
  with check (public.webtoon_is_admin() and auth.uid() = user_id);

drop policy if exists webtoon_projects_update_own on public.webtoon_projects;
drop policy if exists webtoon_projects_update_admin on public.webtoon_projects;
create policy webtoon_projects_update_admin
  on public.webtoon_projects
  for update
  to authenticated
  using (public.webtoon_is_admin())
  with check (public.webtoon_is_admin());

drop policy if exists webtoon_projects_delete_own on public.webtoon_projects;
drop policy if exists webtoon_projects_delete_admin on public.webtoon_projects;
create policy webtoon_projects_delete_admin
  on public.webtoon_projects
  for delete
  to authenticated
  using (public.webtoon_is_admin());

drop policy if exists webtoon_jobs_select_own on public.webtoon_generation_jobs;
drop policy if exists webtoon_jobs_select_admin on public.webtoon_generation_jobs;
create policy webtoon_jobs_select_admin
  on public.webtoon_generation_jobs
  for select
  to authenticated
  using (public.webtoon_is_admin());

create or replace function public.webtoon_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_webtoon_profiles_touch on public.webtoon_profiles;
create trigger trg_webtoon_profiles_touch
  before update on public.webtoon_profiles
  for each row
  execute function public.webtoon_touch_updated_at();

drop trigger if exists trg_webtoon_projects_touch on public.webtoon_projects;
create trigger trg_webtoon_projects_touch
  before update on public.webtoon_projects
  for each row
  execute function public.webtoon_touch_updated_at();

drop trigger if exists trg_webtoon_jobs_touch on public.webtoon_generation_jobs;
create trigger trg_webtoon_jobs_touch
  before update on public.webtoon_generation_jobs
  for each row
  execute function public.webtoon_touch_updated_at();

create or replace function public.webtoon_bootstrap_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', '');
  v_name text := coalesce(auth.jwt() #>> '{user_metadata,full_name}', auth.jwt() #>> '{user_metadata,name}', v_email);
  v_avatar text := coalesce(auth.jwt() #>> '{user_metadata,avatar_url}', '');
  v_inserted integer := 0;
  v_profile public.webtoon_profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.webtoon_profiles (
    user_id,
    display_name,
    avatar_url,
    provider_email,
    acorns
  )
  values (
    v_user_id,
    nullif(v_name, ''),
    nullif(v_avatar, ''),
    nullif(v_email, ''),
    20
  )
  on conflict (user_id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    insert into public.webtoon_acorn_ledger (
      user_id,
      delta,
      balance_after,
      reason,
      metadata
    )
    values (
      v_user_id,
      20,
      20,
      'signup_bonus',
      jsonb_build_object('source', 'google_login')
    );
  end if;

  update public.webtoon_profiles
     set display_name = coalesce(nullif(v_name, ''), display_name),
         avatar_url = coalesce(nullif(v_avatar, ''), avatar_url),
         provider_email = coalesce(nullif(v_email, ''), provider_email)
   where user_id = v_user_id
   returning * into v_profile;

  return jsonb_build_object(
    'schemaVersion', 'webtoon-account/v1',
    'userId', v_profile.user_id,
    'displayName', v_profile.display_name,
    'avatarUrl', v_profile.avatar_url,
    'email', v_profile.provider_email,
    'acorns', v_profile.acorns,
    'isAdmin', public.webtoon_is_admin(),
    'guideCompleted', v_profile.guide_completed
  );
end;
$$;

create or replace function public.webtoon_claim_daily_acorns()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted integer := 0;
  v_balance integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  perform public.webtoon_bootstrap_profile();

  if not public.webtoon_is_admin() then
    raise exception 'not_admin';
  end if;

  insert into public.webtoon_daily_acorn_claims (user_id, claim_date, amount)
  values (v_user_id, current_date, 5)
  on conflict (user_id, claim_date) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select acorns into v_balance
      from public.webtoon_profiles
     where user_id = v_user_id;

    return jsonb_build_object(
      'claimed', false,
      'acorns', v_balance,
      'message', 'already_claimed'
    );
  end if;

  update public.webtoon_profiles
     set acorns = acorns + 5
   where user_id = v_user_id
   returning acorns into v_balance;

  insert into public.webtoon_acorn_ledger (
    user_id,
    delta,
    balance_after,
    reason,
    metadata
  )
  values (
    v_user_id,
    5,
    v_balance,
    'daily_claim',
    jsonb_build_object('claimDate', current_date)
  );

  return jsonb_build_object(
    'claimed', true,
    'acorns', v_balance,
    'message', 'daily_claimed'
  );
end;
$$;

create or replace function public.webtoon_spend_acorns(
  p_amount integer,
  p_reason text,
  p_ref_type text default null,
  p_ref_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_amount integer := coalesce(p_amount, 0);
  v_balance integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if v_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  if p_reason not in ('draft_generation', 'panel_regenerate') then
    raise exception 'invalid_reason';
  end if;

  perform public.webtoon_bootstrap_profile();

  if not public.webtoon_is_admin() then
    raise exception 'not_admin';
  end if;

  update public.webtoon_profiles
     set acorns = acorns - v_amount
   where user_id = v_user_id
     and acorns >= v_amount
   returning acorns into v_balance;

  if v_balance is null then
    raise exception 'not_enough_acorns';
  end if;

  insert into public.webtoon_acorn_ledger (
    user_id,
    delta,
    balance_after,
    reason,
    ref_type,
    ref_id,
    metadata
  )
  values (
    v_user_id,
    -v_amount,
    v_balance,
    p_reason,
    p_ref_type,
    p_ref_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'spent', true,
    'amount', v_amount,
    'acorns', v_balance,
    'reason', p_reason
  );
end;
$$;

create or replace function public.webtoon_start_job(
  p_job_type text,
  p_project_id uuid default null,
  p_scenario_key text default 'awakening-subway-gate',
  p_request_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_job_type text := coalesce(p_job_type, '');
  v_cost integer;
  v_balance integer;
  v_job_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  perform public.webtoon_bootstrap_profile();

  if not public.webtoon_is_admin() then
    raise exception 'not_admin';
  end if;

  select acorns
    into v_balance
    from public.webtoon_profiles
   where user_id = v_user_id
   for update;

  v_cost := case
    when v_job_type = 'draft_generation' then 3
    when v_job_type = 'panel_regenerate' then 1
    else null
  end;

  if v_cost is null then
    raise exception 'invalid_job_type';
  end if;

  insert into public.webtoon_generation_jobs (
    user_id,
    project_id,
    job_type,
    scenario_key,
    cost,
    status,
    progress,
    request_payload
  )
  values (
    v_user_id,
    p_project_id,
    v_job_type,
    coalesce(p_scenario_key, 'awakening-subway-gate'),
    v_cost,
    'ready',
    0,
    coalesce(p_request_payload, '{}'::jsonb)
  )
  returning id into v_job_id;

  if v_cost > 0 then
    perform public.webtoon_spend_acorns(
      v_cost,
      case
        when v_job_type = 'draft_generation' then 'draft_generation'
        else 'panel_regenerate'
      end,
      'webtoon_generation_jobs',
      v_job_id,
      jsonb_build_object('jobType', v_job_type)
    );
  end if;

  select acorns into v_balance
    from public.webtoon_profiles
   where user_id = v_user_id;

  return jsonb_build_object(
    'schemaVersion', 'webtoon-job/v1',
    'jobId', v_job_id,
    'jobType', v_job_type,
    'cost', v_cost,
    'acorns', v_balance,
    'status', 'ready'
  );
end;
$$;

grant usage on schema public to anon, authenticated;
grant execute on function public.webtoon_is_admin() to anon, authenticated;
grant execute on function public.webtoon_bootstrap_profile() to authenticated;
grant execute on function public.webtoon_claim_daily_acorns() to authenticated;
grant execute on function public.webtoon_spend_acorns(integer, text, text, uuid, jsonb) to authenticated;
grant execute on function public.webtoon_start_job(text, uuid, text, jsonb) to authenticated;
