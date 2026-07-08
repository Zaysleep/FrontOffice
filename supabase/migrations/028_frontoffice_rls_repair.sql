-- FrontOffice Build 8B
-- Targeted RLS and privilege hardening
--
-- Goals:
-- 1. Remove dangerous table privileges that the browser app does not need.
-- 2. Keep current authenticated app behavior working.
-- 3. Restrict notification updates to the is_read column only.
-- 4. Limit direct execution of trigger-only SECURITY DEFINER functions.
--
-- This migration is designed to preserve the current FrontOffice behavior.

begin;

-- ============================================================
-- 1. REMOVE DANGEROUS / UNNEEDED TABLE PRIVILEGES
-- ============================================================

-- The browser app never needs TRUNCATE, TRIGGER, or REFERENCES.
-- Revoke them from both browser-facing roles.

revoke truncate, trigger, references
on table
  public.blocks,
  public.bookmarks,
  public.comments,
  public.follows,
  public.notifications,
  public.post_votes,
  public.posts,
  public.private_account_data,
  public.profiles,
  public.receipts,
  public.reports,
  public.sports_cache,
  public.teams,
  public.user_teams
from anon, authenticated;

-- ============================================================
-- 2. TIGHTEN ANONYMOUS TABLE ACCESS
-- ============================================================

-- Anonymous users do not need direct access to private/social tables.
-- Signup is handled through Supabase Auth and the auth trigger.

revoke all
on table
  public.blocks,
  public.bookmarks,
  public.comments,
  public.follows,
  public.notifications,
  public.post_votes,
  public.posts,
  public.private_account_data,
  public.profiles,
  public.receipts,
  public.reports,
  public.sports_cache,
  public.user_teams
from anon;

-- Teams remain intentionally readable before sign-in/onboarding.
grant select
on table public.teams
to anon, authenticated;

-- ============================================================
-- 3. KEEP AUTHENTICATED APP ACCESS EXPLICIT
-- ============================================================

-- Public/social read access is still governed by RLS policies.

grant select
on table
  public.profiles,
  public.user_teams,
  public.posts,
  public.comments,
  public.post_votes,
  public.follows,
  public.receipts,
  public.sports_cache
to authenticated;

-- Owner-scoped writes remain protected by existing RLS policies.

grant insert, delete
on table
  public.blocks,
  public.bookmarks,
  public.comments,
  public.follows,
  public.post_votes,
  public.posts,
  public.reports,
  public.user_teams
to authenticated;

grant update
on table
  public.profiles,
  public.post_votes,
  public.receipts,
  public.user_teams
to authenticated;

grant delete
on table
  public.receipts
to authenticated;

grant select
on table
  public.blocks,
  public.bookmarks,
  public.notifications,
  public.private_account_data,
  public.reports
to authenticated;

-- ============================================================
-- 4. NOTIFICATIONS: ALLOW ONLY READ-STATE UPDATES
-- ============================================================

-- Remove broad UPDATE access, then grant update only on is_read.
-- Existing RLS still limits updates to rows where:
-- auth.uid() = recipient_id

revoke update
on table public.notifications
from authenticated;

grant update (is_read)
on table public.notifications
to authenticated;

-- ============================================================
-- 5. REPORTS: KEEP USER SUBMISSIONS IMMUTABLE
-- ============================================================

-- Users may create and read their own reports,
-- but cannot edit moderation status or delete submitted reports.

revoke update, delete
on table public.reports
from authenticated;

grant select, insert
on table public.reports
to authenticated;

-- ============================================================
-- 6. PRIVATE ACCOUNT DATA: SELF-READ ONLY
-- ============================================================

revoke insert, update, delete
on table public.private_account_data
from authenticated;

grant select
on table public.private_account_data
to authenticated;

-- ============================================================
-- 7. SECURITY DEFINER FUNCTION EXECUTION HARDENING
-- ============================================================

-- Trigger-only/internal functions should not be callable directly
-- from browser roles.

revoke execute on function public.cleanup_frontoffice_block_relationship()
from public, anon, authenticated;

revoke execute on function public.create_receipt_for_post()
from public, anon, authenticated;

revoke execute on function public.enforce_frontoffice_moderation()
from public, anon, authenticated;

revoke execute on function public.guard_frontoffice_bookmark_block()
from public, anon, authenticated;

revoke execute on function public.guard_frontoffice_comment_block()
from public, anon, authenticated;

revoke execute on function public.guard_frontoffice_follow_block()
from public, anon, authenticated;

revoke execute on function public.guard_frontoffice_vote_block()
from public, anon, authenticated;

revoke execute on function public.handle_new_auth_user()
from public, anon, authenticated;

revoke execute on function public.notify_direct_mentions_on_comment()
from public, anon, authenticated;

revoke execute on function public.notify_discussion_participants_on_comment()
from public, anon, authenticated;

revoke execute on function public.notify_post_author_on_comment()
from public, anon, authenticated;

revoke execute on function public.notify_post_author_on_vote_milestone()
from public, anon, authenticated;

revoke execute on function public.notify_user_on_follow()
from public, anon, authenticated;

revoke execute on function public.suppress_frontoffice_blocked_notification()
from public, anon, authenticated;

-- Internal helper used by trusted trigger/functions.
revoke execute on function public.is_blocked_between(uuid, uuid)
from public, anon;

-- Keep authenticated execution because current app/database flows may
-- legitimately use this helper through RPC or policy-adjacent logic.
grant execute on function public.is_blocked_between(uuid, uuid)
to authenticated;

-- ============================================================
-- 8. RPC EXECUTION GRANTS REQUIRED BY CURRENT APP
-- ============================================================

-- Onboarding/profile save RPCs.
revoke execute on function public.complete_onboarding(text, text, jsonb)
from public, anon;

grant execute on function public.complete_onboarding(text, text, jsonb)
to authenticated;

revoke execute on function public.complete_team_onboarding(jsonb)
from public, anon;

grant execute on function public.complete_team_onboarding(jsonb)
to authenticated;

-- Social read helper used by the app.
revoke execute on function public.get_post_interaction_counts()
from public, anon;

grant execute on function public.get_post_interaction_counts()
to authenticated;

-- Block-list helper is self-scoped through auth.uid().
revoke execute on function public.get_my_blocked_profile_ids()
from public, anon;

grant execute on function public.get_my_blocked_profile_ids()
to authenticated;

-- Username availability must remain usable during signup.
revoke execute on function public.is_handle_available(text)
from public;

grant execute on function public.is_handle_available(text)
to anon, authenticated;

-- Cache cleanup should not be directly callable from browser roles.
revoke execute on function public.delete_expired_sports_cache()
from public, anon, authenticated;

commit;
