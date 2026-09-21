-- ConecktOS Phase 1: per-user preferences moved server-side.
-- A small jsonb bag on the profile so per-user UI state (onboarding-ribbon
-- dismissals, GPS location consent) follows the person across devices instead of
-- living in one browser's localStorage. Each user updates only their own row
-- (existing profiles_update RLS: id = auth.uid()).

begin;

alter table public.profiles
  add column if not exists prefs jsonb not null default '{}'::jsonb;

commit;
