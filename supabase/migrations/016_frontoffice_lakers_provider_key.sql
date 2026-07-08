-- FrontOffice Build 13D
-- Provider key for the first real NBA vertical slice.

update public.teams
set provider_key = 'lal'
where sport = 'NBA'
  and name = 'Los Angeles Lakers';
