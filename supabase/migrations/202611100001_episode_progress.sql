create table if not exists public.episode_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_id integer not null,
  season_number integer not null check (season_number >= 0),
  episode_number integer not null check (episode_number > 0),
  series_title text not null,
  poster_path text,
  watched_at timestamptz not null default now(),
  primary key (user_id, tmdb_id, season_number, episode_number)
);

create index if not exists episode_progress_user_tmdb_idx
  on public.episode_progress (user_id, tmdb_id);

alter table public.episode_progress enable row level security;

grant select, insert, update, delete
  on public.episode_progress to authenticated;

drop policy if exists "Users manage their own episode progress"
  on public.episode_progress;

create policy "Users manage their own episode progress"
  on public.episode_progress
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
