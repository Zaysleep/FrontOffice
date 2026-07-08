-- FrontOffice Build 8A
-- Non-destructive RLS audit
--
-- This script DOES NOT change your database.
-- It only shows:
-- 1. Whether RLS is enabled
-- 2. Which policies exist
-- 3. Which roles have table privileges
-- 4. Which foreign keys and delete behaviors exist

-- ============================================================
-- 1. RLS STATUS
-- ============================================================

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
where
  n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles',
    'private_account_data',
    'user_teams',
    'teams',
    'posts',
    'comments',
    'post_votes',
    'bookmarks',
    'follows',
    'notifications',
    'receipts',
    'reports',
    'blocks',
    'sports_cache'
  )
order by c.relname;

-- ============================================================
-- 2. CURRENT RLS POLICIES
-- ============================================================

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where
  schemaname = 'public'
  and tablename in (
    'profiles',
    'private_account_data',
    'user_teams',
    'teams',
    'posts',
    'comments',
    'post_votes',
    'bookmarks',
    'follows',
    'notifications',
    'receipts',
    'reports',
    'blocks',
    'sports_cache'
  )
order by tablename, cmd, policyname;

-- ============================================================
-- 3. TABLE PRIVILEGES
-- ============================================================

select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where
  table_schema = 'public'
  and table_name in (
    'profiles',
    'private_account_data',
    'user_teams',
    'teams',
    'posts',
    'comments',
    'post_votes',
    'bookmarks',
    'follows',
    'notifications',
    'receipts',
    'reports',
    'blocks',
    'sports_cache'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- ============================================================
-- 4. FOREIGN KEYS + DELETE BEHAVIOR
-- ============================================================

select
  tc.table_name,
  kcu.column_name,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column,
  rc.delete_rule,
  rc.update_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.constraint_schema = kcu.constraint_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.constraint_schema = tc.constraint_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
  and rc.constraint_schema = tc.constraint_schema
where
  tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name in (
    'profiles',
    'private_account_data',
    'user_teams',
    'teams',
    'posts',
    'comments',
    'post_votes',
    'bookmarks',
    'follows',
    'notifications',
    'receipts',
    'reports',
    'blocks',
    'sports_cache'
  )
order by tc.table_name, kcu.column_name;

-- ============================================================
-- 5. SECURITY DEFINER FUNCTIONS
-- ============================================================

select
  n.nspname as schema_name,
  p.proname as function_name,
  p.prosecdef as security_definer,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where
  n.nspname = 'public'
  and p.prosecdef = true
order by p.proname;
