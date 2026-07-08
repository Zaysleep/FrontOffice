-- FrontOffice Build 15A
-- MLS team directory seed

begin;

insert into public.teams (
  name,
  sport,
  league,
  abbreviation,
  provider_key
)
values
  ('Atlanta United FC', 'SOCCER', 'MLS', 'ATL', 'atl'),
  ('Austin FC', 'SOCCER', 'MLS', 'AUS', 'aus'),
  ('Charlotte FC', 'SOCCER', 'MLS', 'CLT', 'clt'),
  ('Chicago Fire FC', 'SOCCER', 'MLS', 'CHI', 'chi'),
  ('FC Cincinnati', 'SOCCER', 'MLS', 'CIN', 'cin'),
  ('Colorado Rapids', 'SOCCER', 'MLS', 'COL', 'col'),
  ('Columbus Crew', 'SOCCER', 'MLS', 'CLB', 'clb'),
  ('FC Dallas', 'SOCCER', 'MLS', 'DAL', 'dal'),
  ('D.C. United', 'SOCCER', 'MLS', 'DC', 'dc'),
  ('Houston Dynamo FC', 'SOCCER', 'MLS', 'HOU', 'hou'),
  ('Sporting Kansas City', 'SOCCER', 'MLS', 'SKC', 'skc'),
  ('LAFC', 'SOCCER', 'MLS', 'LAFC', 'lafc'),
  ('LA Galaxy', 'SOCCER', 'MLS', 'LAG', 'la'),
  ('Inter Miami CF', 'SOCCER', 'MLS', 'MIA', 'mia'),
  ('Minnesota United FC', 'SOCCER', 'MLS', 'MIN', 'min'),
  ('CF Montréal', 'SOCCER', 'MLS', 'MTL', 'mtl'),
  ('Nashville SC', 'SOCCER', 'MLS', 'NSH', 'nsh'),
  ('New England Revolution', 'SOCCER', 'MLS', 'NE', 'ne'),
  ('New York City FC', 'SOCCER', 'MLS', 'NYC', 'nyc'),
  ('New York Red Bulls', 'SOCCER', 'MLS', 'NYRB', 'ny'),
  ('Orlando City SC', 'SOCCER', 'MLS', 'ORL', 'orl'),
  ('Philadelphia Union', 'SOCCER', 'MLS', 'PHI', 'phi'),
  ('Portland Timbers', 'SOCCER', 'MLS', 'POR', 'por'),
  ('Real Salt Lake', 'SOCCER', 'MLS', 'RSL', 'rsl'),
  ('San Diego FC', 'SOCCER', 'MLS', 'SD', 'sd'),
  ('San Jose Earthquakes', 'SOCCER', 'MLS', 'SJ', 'sj'),
  ('Seattle Sounders FC', 'SOCCER', 'MLS', 'SEA', 'sea'),
  ('St. Louis CITY SC', 'SOCCER', 'MLS', 'STL', 'stl'),
  ('Toronto FC', 'SOCCER', 'MLS', 'TOR', 'tor'),
  ('Vancouver Whitecaps FC', 'SOCCER', 'MLS', 'VAN', 'van')
on conflict do nothing;

commit;
