-- FrontOffice backend foundation
-- Build 5: core social schema + My Teams + sports cache foundation

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  handle text not null unique,
  initials text not null,
  bio text not null default '',
  profile_image_url text,
  banner_image_url text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_handle_format check (handle ~ '^@[A-Za-z0-9_]{2,29}$')
);

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Teams and My Teams
-- ---------------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  sport text not null,
  league text,
  name text not null,
  city text,
  abbreviation text,
  provider_key text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (sport, name)
);

create table if not exists public.user_teams (
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  sort_order smallint not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, team_id),
  unique (user_id, sort_order),
  constraint user_teams_sort_order check (sort_order between 1 and 5)
);

-- ---------------------------------------------------------------------------
-- Social graph
-- ---------------------------------------------------------------------------

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

-- ---------------------------------------------------------------------------
-- Takes / posts
-- ---------------------------------------------------------------------------

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  team_name_snapshot text not null,
  call_type text not null,
  confidence text not null,
  take text not null,
  tag text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint posts_take_length check (char_length(take) between 1 and 2000),
  constraint posts_confidence check (confidence in ('High', 'Lock It In', 'Let Me Cook'))
);

drop trigger if exists posts_set_updated_at on public.posts;

create trigger posts_set_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Comments and replies
-- ---------------------------------------------------------------------------

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint comments_body_length check (char_length(body) between 1 and 500)
);

drop trigger if exists comments_set_updated_at on public.comments;

create trigger comments_set_updated_at
before update on public.comments
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Votes
-- ---------------------------------------------------------------------------

create table if not exists public.post_votes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id),
  constraint post_votes_value check (value in (-1, 1))
);

drop trigger if exists post_votes_set_updated_at on public.post_votes;

create trigger post_votes_set_updated_at
before update on public.post_votes
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Bookmarks
-- ---------------------------------------------------------------------------

create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, post_id)
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  title text not null,
  body text not null default '',
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notifications_type check (type in ('comment', 'reply', 'follow', 'milestone'))
);

-- ---------------------------------------------------------------------------
-- Receipts
-- ---------------------------------------------------------------------------

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'Still Cooking',
  reaction text not null,
  outcome_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint receipts_status check (
    status in ('Still Cooking', 'Called It', 'Aged Like Wine', 'Aged Like Milk')
  )
);

drop trigger if exists receipts_set_updated_at on public.receipts;

create trigger receipts_set_updated_at
before update on public.receipts
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Sports API cache
-- ---------------------------------------------------------------------------

create table if not exists public.sports_cache (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  section text not null,
  payload jsonb not null,
  provider text,
  fetched_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  unique (team_id, section),
  constraint sports_cache_section check (
    section in ('top_report', 'bulletin', 'medical', 'stat_sheet', 'ledger', 'rumor_mill')
  )
);

-- ---------------------------------------------------------------------------
-- Helpful indexes
-- ---------------------------------------------------------------------------

create index if not exists posts_author_created_idx
on public.posts(author_id, created_at desc);

create index if not exists posts_team_created_idx
on public.posts(team_id, created_at desc);

create index if not exists comments_post_created_idx
on public.comments(post_id, created_at asc);

create index if not exists follows_following_idx
on public.follows(following_id);

create index if not exists notifications_recipient_created_idx
on public.notifications(recipient_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
on public.notifications(recipient_id, is_read, created_at desc);

create index if not exists sports_cache_expiration_idx
on public.sports_cache(expires_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Build 5 intentionally enables RLS now.
-- Build 6 (Authentication) will add user-aware policies.
-- Teams are safe to read publicly; user/social tables remain locked until
-- policies are added.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.user_teams enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_votes enable row level security;
alter table public.bookmarks enable row level security;
alter table public.notifications enable row level security;
alter table public.receipts enable row level security;
alter table public.sports_cache enable row level security;

drop policy if exists "Teams are publicly readable" on public.teams;

create policy "Teams are publicly readable"
on public.teams
for select
using (true);

-- Sports cache will be read through server-side helpers in the API integration build.
