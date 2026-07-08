-- FrontOffice Trust & Launch Build 4A
-- Server-side moderation enforcement for posts, comments, and profile identity.
-- Ordinary profanity is intentionally not blocked.

create or replace function public.normalize_moderation_text(input_text text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      regexp_replace(
        translate(
          lower(normalize(coalesce(input_text, ''), NFKC)),
          '013457@$',
          'oieatsa s'
        ),
        '[^a-z0-9\s]',
        ' ',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

create or replace function public.frontoffice_moderation_reason(input_text text)
returns text
language plpgsql
immutable
as $$
declare
  normalized_text text;
  compact_text text;
  blocked_terms text[] := array[
    'chink',
    'gook',
    'kike',
    'spic',
    'wetback',
    'raghead',
    'towelhead',
    'faggot',
    'tranny'
  ];
  blocked_term text;
begin
  normalized_text := public.normalize_moderation_text(input_text);
  compact_text := regexp_replace(normalized_text, '\s+', '', 'g');

  foreach blocked_term in array blocked_terms
  loop
    if normalized_text ~ ('(^|\s)' || blocked_term || '($|\s)')
       or compact_text like ('%' || regexp_replace(blocked_term, '\s+', '', 'g') || '%')
    then
      return 'blocked_term';
    end if;
  end loop;

  if normalized_text ~ '\m(all|those|these)\s+(black|white|asian|latino|hispanic|arab|muslim|jewish|gay|trans)\s+(people\s+)?(are\s+)?(animals|vermin|filth|disease)\M'
     or normalized_text ~ '\m(kill|exterminate|eradicate|remove)\s+(all\s+)?(black|white|asian|latino|hispanic|arab|muslim|jewish|gay|trans)(\s+people)?\M'
     or normalized_text ~ '\m(black|white|asian|latino|hispanic|arab|muslim|jewish|gay|trans)\s+(people\s+)?(are\s+)?(inferior|subhuman|vermin|animals)\M'
  then
    return 'hate_pattern';
  end if;

  return null;
end;
$$;

create or replace function public.enforce_frontoffice_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reason text;
begin
  if tg_table_name = 'posts' then
    reason := public.frontoffice_moderation_reason(new.take);
  elsif tg_table_name = 'comments' then
    reason := public.frontoffice_moderation_reason(new.body);
  elsif tg_table_name = 'profiles' then
    reason := public.frontoffice_moderation_reason(
      concat_ws(' ', new.name, new.handle, new.bio)
    );
  end if;

  if reason is not null then
    raise exception using
      errcode = '22023',
      message = 'That wording is not allowed on FrontOffice. Rewrite it and try again.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_posts_moderation on public.posts;
create trigger enforce_posts_moderation
before insert or update of take
on public.posts
for each row
execute function public.enforce_frontoffice_moderation();

drop trigger if exists enforce_comments_moderation on public.comments;
create trigger enforce_comments_moderation
before insert or update of body
on public.comments
for each row
execute function public.enforce_frontoffice_moderation();

drop trigger if exists enforce_profiles_moderation on public.profiles;
create trigger enforce_profiles_moderation
before insert or update of name, handle, bio
on public.profiles
for each row
execute function public.enforce_frontoffice_moderation();

revoke all on function public.frontoffice_moderation_reason(text) from public;
grant execute on function public.frontoffice_moderation_reason(text) to anon, authenticated;
