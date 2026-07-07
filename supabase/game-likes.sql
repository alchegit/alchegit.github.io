-- NeoKIM Game Cabinet likes for Supabase.
-- Run this once in Supabase SQL Editor for project anjbgbqkeukllsdxgckv.

create table if not exists public.game_likes (
  game_id text not null,
  voter_hash text not null,
  page text not null default '/games/',
  created_at timestamptz not null default now(),
  primary key (game_id, voter_hash),
  constraint game_likes_game_id_format check (game_id ~ '^[a-z0-9-]{3,80}$'),
  constraint game_likes_voter_hash_format check (voter_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists idx_game_likes_game_id
  on public.game_likes (game_id);

create table if not exists public.game_like_rate_limits (
  voter_hash text primary key,
  window_start timestamptz not null,
  count integer not null default 0,
  constraint game_like_rate_limits_voter_hash_format check (voter_hash ~ '^[a-f0-9]{64}$')
);

alter table public.game_likes enable row level security;
alter table public.game_like_rate_limits enable row level security;

revoke all on public.game_likes from anon, authenticated;
revoke all on public.game_like_rate_limits from anon, authenticated;

create or replace function public.game_like_valid_ids()
returns text[]
language sql
immutable
as $$
  select array[
    'released-ufo-signal-room',
    'released-galacticode-cipher-lab',
    'flame-pudding-pad-race',
    'flame-pocket-rogue-bakery',
    'defold-star-delivery-rocket',
    'defold-marshmallow-sling',
    'html5-pixel-color-garden',
    'released-color-master-memory',
    'released-color-master-2-spectrum-sprint',
    'released-dark-maze-lab-run',
    'phaser-jelly-brick-shop',
    'solar2d-lunchbox-tapper',
    'love-moon-letter-runner'
  ]::text[];
$$;

create or replace function public.get_game_like_counts()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with valid_games as (
    select unnest(public.game_like_valid_ids()) as game_id
  ),
  live_counts as (
    select valid_games.game_id, count(game_likes.voter_hash)::integer as count
    from valid_games
    left join public.game_likes
      on game_likes.game_id = valid_games.game_id
    group by valid_games.game_id
  )
  select jsonb_build_object(
    'schemaVersion', 'game-likes/v1',
    'source', 'supabase',
    'updatedAt', now(),
    'counts', coalesce(jsonb_object_agg(game_id, count), '{}'::jsonb)
  )
  from live_counts;
$$;

create or replace function public.create_game_like(
  p_game_id text,
  p_voter_hash text,
  p_page text default '/games/'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_id text := trim(coalesce(p_game_id, ''));
  v_voter_hash text := lower(trim(coalesce(p_voter_hash, '')));
  v_page text := left(case when coalesce(p_page, '') like '/%' then p_page else '/games/' end, 120);
  v_window_start timestamptz := date_trunc('minute', now());
  v_rate_count integer;
  v_inserted integer;
  v_count integer;
begin
  if not v_game_id = any(public.game_like_valid_ids()) then
    raise exception 'unknown_game_id';
  end if;

  if v_voter_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_voter_hash';
  end if;

  insert into public.game_like_rate_limits (voter_hash, window_start, count)
  values (v_voter_hash, v_window_start, 1)
  on conflict (voter_hash) do update
    set window_start = case
        when public.game_like_rate_limits.window_start < v_window_start then v_window_start
        else public.game_like_rate_limits.window_start
      end,
      count = case
        when public.game_like_rate_limits.window_start < v_window_start then 1
        else public.game_like_rate_limits.count + 1
      end
  returning count into v_rate_count;

  if v_rate_count > 8 then
    raise exception 'rate_limited';
  end if;

  insert into public.game_likes (game_id, voter_hash, page)
  values (v_game_id, v_voter_hash, v_page)
  on conflict (game_id, voter_hash) do nothing;

  get diagnostics v_inserted = row_count;

  select count(*)::integer
    into v_count
  from public.game_likes
  where game_id = v_game_id;

  return jsonb_build_object(
    'schemaVersion', 'game-likes/v1',
    'gameId', v_game_id,
    'count', v_count,
    'liked', true,
    'duplicate', v_inserted = 0
  );
end;
$$;

grant usage on schema public to anon, authenticated;
grant execute on function public.get_game_like_counts() to anon, authenticated;
grant execute on function public.create_game_like(text, text, text) to anon, authenticated;
