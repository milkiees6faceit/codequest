create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text not null,
  plan text not null default 'free' check (plan in ('free', 'monthly', 'yearly', 'pro')),
  progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  lesson_id text not null,
  completed boolean not null default false,
  score integer not null default 100,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists public.user_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null,
  course_id text not null,
  xp_awarded integer not null default 0,
  submitted_at timestamptz not null default now(),
  unique (user_id, project_id)
);

create table if not exists public.certificates (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  course_title text not null,
  issued_at timestamptz not null default now(),
  verification_status text not null default 'valid' check (verification_status in ('valid', 'revoked')),
  unique (user_id, course_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'monthly', 'yearly', 'pro')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  provider text not null default 'demo',
  subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.user_progress enable row level security;
alter table public.user_projects enable row level security;
alter table public.certificates enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "user_progress_select_own" on public.user_progress;
create policy "user_progress_select_own"
on public.user_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "user_progress_insert_own" on public.user_progress;
create policy "user_progress_insert_own"
on public.user_progress
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "user_progress_update_own" on public.user_progress;
create policy "user_progress_update_own"
on public.user_progress
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "user_projects_select_own" on public.user_projects;
create policy "user_projects_select_own"
on public.user_projects
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "user_projects_insert_own" on public.user_projects;
create policy "user_projects_insert_own"
on public.user_projects
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "certificates_select_own" on public.certificates;
create policy "certificates_select_own"
on public.certificates
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "certificates_insert_own" on public.certificates;
create policy "certificates_insert_own"
on public.certificates
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);
