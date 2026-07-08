-- FrontOffice Build 13E
-- Provider keys for all supported NBA, NFL, MLB, and Premier League teams.

update public.teams
set provider_key = lower(abbreviation)
where league in ('NBA', 'NFL', 'MLB', 'Premier League')
  and abbreviation is not null;
