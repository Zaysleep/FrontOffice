-- FrontOffice Trust & Launch Build 4B
-- Expanded identity-based hate moderation across all current user text surfaces.
-- Ordinary profanity remains allowed.

create or replace function public.normalize_moderation_text(input_text text)
returns text
language plpgsql
immutable
as $$
declare
  value text := lower(coalesce(input_text, ''));
begin
  value := replace(value, '0', 'o');
  value := replace(value, '1', 'i');
  value := replace(value, '2', 'z');
  value := replace(value, '3', 'e');
  value := replace(value, '4', 'a');
  value := replace(value, '5', 's');
  value := replace(value, '6', 'g');
  value := replace(value, '7', 't');
  value := replace(value, '8', 'b');
  value := replace(value, '9', 'g');
  value := replace(value, '@', 'a');
  value := replace(value, '$', 's');
  value := replace(value, '!', 'i');

  value := regexp_replace(value, '[^a-z0-9[:space:]]', ' ', 'g');
  value := regexp_replace(value, '[[:space:]]+', ' ', 'g');

  return trim(value);
end;
$$;

create or replace function public.frontoffice_moderation_reason(input_text text)
returns text
language plpgsql
immutable
as $$
declare
  normalized_text text;
  blocked_terms text[] := array[
    'chink',
    'gook',
    'kike',
    'spic',
    'wetback',
    'beaner',
    'coon',
    'darkie',
    'jigaboo',
    'pickaninny',
    'zipperhead',
    'sandnigger',
    'raghead',
    'towelhead',
    'camel jockey',
    'paki',
    'gyppo',
    'faggot',
    'dyke',
    'tranny',
    'shemale',
    'retard',
    'mongoloid'
  ];
  blocked_term text;
  pattern_text text;
begin
  normalized_text := public.normalize_moderation_text(input_text);

  foreach blocked_term in array blocked_terms
  loop
    -- Exact term, with whitespace-flexible matching for basic obfuscation.
    pattern_text :=
      '(^|[[:space:]])' ||
      regexp_replace(blocked_term, '(.)', '\1[[:space:]]*', 'g') ||
      '([[:space:]]|$)';

    if normalized_text ~ pattern_text then
      return 'blocked_term';
    end if;
  end loop;

  if normalized_text ~
      '\m(all|those|these)[[:space:]]+(black|white|asian|latino|hispanic|arab|middle eastern|indian|pakistani|jewish|muslim|christian|gay|lesbian|bisexual|trans|transgender|disabled|immigrant)[[:space:]]+(people[[:space:]]+)?(are[[:space:]]+)?(animals|vermin|filth|disease|subhuman|inferior)\M'
     or normalized_text ~
      '\m(kill|exterminate|eradicate|eliminate|remove|deport)[[:space:]]+(all[[:space:]]+)?(black|white|asian|latino|hispanic|arab|middle eastern|indian|pakistani|jewish|muslim|christian|gay|lesbian|bisexual|trans|transgender|disabled|immigrant)([[:space:]]+people)?\M'
     or normalized_text ~
      '\m(black|white|asian|latino|hispanic|arab|middle eastern|indian|pakistani|jewish|muslim|christian|gay|lesbian|bisexual|trans|transgender|disabled|immigrant)[[:space:]]+(people[[:space:]]+)?(are[[:space:]]+)?(animals|vermin|filth|disease|subhuman|inferior)\M'
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
  elsif tg_table_name = 'receipts' then
    reason := public.frontoffice_moderation_reason(
      concat_ws(' ', new.reaction, new.outcome_note)
    );
  elsif tg_table_name = 'notifications' then
    reason := public.frontoffice_moderation_reason(
      concat_ws(' ', new.title, new.body)
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

drop trigger if exists enforce_receipts_moderation on public.receipts;
create trigger enforce_receipts_moderation
before insert or update of reaction, outcome_note
on public.receipts
for each row
execute function public.enforce_frontoffice_moderation();

drop trigger if exists enforce_notifications_moderation on public.notifications;
create trigger enforce_notifications_moderation
before insert or update of title, body
on public.notifications
for each row
execute function public.enforce_frontoffice_moderation();
