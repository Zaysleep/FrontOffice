-- FrontOffice schema compatibility fix
-- Allow the legacy/default "Medium" confidence value used by initialCallForm.

alter table public.posts
drop constraint if exists posts_confidence;

alter table public.posts
add constraint posts_confidence
check (
  confidence in (
    'Medium',
    'High',
    'Lock It In',
    'Let Me Cook'
  )
);
