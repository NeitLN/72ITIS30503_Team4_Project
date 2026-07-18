-- Phase 8: real user profiles + public seller storefronts.
-- Additive only — no drops, no data loss. avatar_url/updated_at already
-- exist on public.users (base schema) and are reused as-is.

alter table public.users add column if not exists username text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists location text;

-- Username is always stored normalized (lowercase) by the application layer;
-- this constraint is defense-in-depth, not the primary enforcement point.
alter table public.users drop constraint if exists users_username_format_check;
alter table public.users add constraint users_username_format_check
  check (username is null or username ~ '^[a-z0-9_-]{3,30}$');

-- Case-insensitive-by-construction uniqueness (values are always lowercase),
-- NULLs (no username yet) are unrestricted.
drop index if exists users_username_unique_idx;
create unique index users_username_unique_idx on public.users (username) where username is not null;

create index if not exists idx_users_username on public.users (username);
