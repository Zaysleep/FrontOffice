-- FrontOffice Trust & Launch Build 4C
-- Expanded high-confidence identity-based slur and hate-pattern enforcement.
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
  value := replace(value, '|', 'i');
  value := replace(value, '+', 't');

  value := regexp_replace(value, '[^a-z0-9[:space:]]', ' ', 'g');
  value := regexp_replace(value, '(.)\\1{2,}', '\\1\\1', 'g');
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
    'nigger','nigga','coon','jigaboo','pickaninny','sambo','darkie','porch monkey','moon cricket','tar baby',
    'chink','gook','zipperhead','slant eye','ching chong',
    'kike','heeb','hymie',
    'spic','wetback','beaner','greaser',
    'sandnigger','sand nigger','raghead','towelhead','camel jockey','dune coon',
    'paki',
    'prairie nigger','redskin','wagon burner',
    'gyppo',
    'faggot','fag','dyke','tranny','shemale',
    'retard','mongoloid'
  ];
  blocked_term text;
  pattern_text text;
begin
  normalized_text := public.normalize_moderation_text(input_text);

  foreach blocked_term in array blocked_terms
  loop
    pattern_text :=
      '(^|[[:space:]])' ||
      regexp_replace(
        public.normalize_moderation_text(blocked_term),
        '(.)',
        '\\1+[[:space:]]*',
        'g'
      ) ||
      '([[:space:]]|$)';

    if normalized_text ~ pattern_text then
      return 'blocked_term';
    end if;
  end loop;

  if normalized_text ~
      '\m(all|those|these)[[:space:]]+(black|white|asian|latino|hispanic|arab|middle eastern|indian|pakistani|jewish|jew|muslim|christian|gay|lesbian|bisexual|trans|transgender|disabled|immigrant|indigenous|native american)[[:space:]]+(people[[:space:]]+)?(are[[:space:]]+)?(animals|vermin|filth|disease|subhuman|inferior|savages)\M'
     or normalized_text ~
      '\m(kill|exterminate|eradicate|eliminate|remove|deport|wipe out)[[:space:]]+(all[[:space:]]+)?(black|white|asian|latino|hispanic|arab|middle eastern|indian|pakistani|jewish|jew|muslim|christian|gay|lesbian|bisexual|trans|transgender|disabled|immigrant|indigenous|native american)([[:space:]]+people)?\M'
     or normalized_text ~
      '\m(black|white|asian|latino|hispanic|arab|middle eastern|indian|pakistani|jewish|jew|muslim|christian|gay|lesbian|bisexual|trans|transgender|disabled|immigrant|indigenous|native american)[[:space:]]+(people[[:space:]]+)?(are[[:space:]]+)?(animals|vermin|filth|disease|subhuman|inferior|savages)\M'
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
