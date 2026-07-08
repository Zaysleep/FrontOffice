import type { BulletinData } from "../types";

const ESPN_NBA_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";

type EspnCompetitor = {
   homeAway?: "home" | "away";
   winner?: boolean;
   score?: string;
   team?: {
      abbreviation?: string;
      displayName?: string;
   };
   records?: Array<{
      summary?: string;
      type?: string;
   }>;
};

type EspnCompetition = {
   date?: string;
   competitors?: EspnCompetitor[];
};

type EspnEvent = {
   date?: string;
   name?: string;
   competitions?: EspnCompetition[];
   status?: {
      type?: {
         completed?: boolean;
         state?: string;
      };
   };
};

type EspnScheduleResponse = {
   events?: EspnEvent[];
};

type EspnStandingEntry = {
   team?: {
      abbreviation?: string;
      displayName?: string;
   };
   stats?: Array<{
      name?: string;
      displayName?: string;
      displayValue?: string;
      value?: number;
   }>;
};

type EspnStandingsChild = {
   name?: string;
   standings?: {
      entries?: EspnStandingEntry[];
   };
};

type EspnStandingsResponse = {
   children?: EspnStandingsChild[];
};

function normalizeDate(value?: string) {
   if (!value) {
      return undefined;
   }

   const date = new Date(value);

   return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function getOpponent(competitors: EspnCompetitor[], teamAbbreviation: string) {
   return competitors.find((competitor) => competitor.team?.abbreviation?.toUpperCase() !== teamAbbreviation.toUpperCase());
}

function getTeamCompetitor(competitors: EspnCompetitor[], teamAbbreviation: string) {
   return competitors.find((competitor) => competitor.team?.abbreviation?.toUpperCase() === teamAbbreviation.toUpperCase());
}

function getGameScore(competitors: EspnCompetitor[], teamAbbreviation: string) {
   const team = getTeamCompetitor(competitors, teamAbbreviation);
   const opponent = getOpponent(competitors, teamAbbreviation);

   if (!team?.score || !opponent?.score) {
      return undefined;
   }

   return `${team.score}-${opponent.score}`;
}

function getGameResult(competitors: EspnCompetitor[], teamAbbreviation: string) {
   const team = getTeamCompetitor(competitors, teamAbbreviation);

   if (typeof team?.winner !== "boolean") {
      return undefined;
   }

   return team.winner ? "W" : "L";
}

function getRecord(entries: EspnStandingEntry[], teamAbbreviation: string) {
   const entry = entries.find((item) => item.team?.abbreviation?.toUpperCase() === teamAbbreviation.toUpperCase());

   const recordStat = entry?.stats?.find((stat) => stat.name === "overall" || stat.displayName === "Overall" || stat.name === "record");

   return recordStat?.displayValue;
}

function getStanding(groups: EspnStandingsChild[], teamAbbreviation: string) {
   for (const group of groups) {
      const entries = group.standings?.entries ?? [];

      const entry = entries.find((item) => item.team?.abbreviation?.toUpperCase() === teamAbbreviation.toUpperCase());

      if (!entry) {
         continue;
      }

      const standingStat = entry.stats?.find((stat) => stat.name === "playoffSeed" || stat.name === "rank" || stat.displayName === "Playoff Seed" || stat.displayName === "Rank");

      const standingValue = standingStat?.value ?? (standingStat?.displayValue ? Number.parseInt(standingStat.displayValue, 10) : undefined);

      if (typeof standingValue === "number" && Number.isFinite(standingValue) && standingValue > 0) {
         const groupName = group.name ?? "Conference";
         return `${ordinal(Math.trunc(standingValue))} in ${groupName}`;
      }

      // Do not infer standing from response array order. Some provider
      // responses are not guaranteed to be sorted by conference rank.
      return undefined;
   }

   return undefined;
}

function ordinal(value: number) {
   const mod100 = value % 100;

   if (mod100 >= 11 && mod100 <= 13) {
      return `${value}th`;
   }

   switch (value % 10) {
      case 1:
         return `${value}st`;
      case 2:
         return `${value}nd`;
      case 3:
         return `${value}rd`;
      default:
         return `${value}th`;
   }
}

export async function fetchNbaBulletin({ teamAbbreviation, season }: { teamAbbreviation: string; season: number }): Promise<BulletinData> {
   const [scheduleResponse, standingsResponse] = await Promise.all([
      fetch(`${ESPN_NBA_BASE_URL}/teams/${teamAbbreviation.toLowerCase()}/schedule?season=${season}`, {
         next: {
            revalidate: 3600,
         },
      }),
      fetch(`${ESPN_NBA_BASE_URL.replace("/site/v2", "/v2")}/standings?season=${season}`, {
         next: {
            revalidate: 3600,
         },
      }),
   ]);

   if (!scheduleResponse.ok) {
      throw new Error(`NBA schedule request failed with ${scheduleResponse.status}.`);
   }

   const schedule = (await scheduleResponse.json()) as EspnScheduleResponse;

   const standings = standingsResponse.ok ? ((await standingsResponse.json()) as EspnStandingsResponse) : ({ children: [] } satisfies EspnStandingsResponse);

   const events = schedule.events ?? [];

   const completedEvents = events.filter((event) => event.status?.type?.completed === true);

   const upcomingEvents = events.filter((event) => event.status?.type?.completed !== true && event.date && new Date(event.date).getTime() >= Date.now());

   completedEvents.sort((first, second) => new Date(second.date ?? 0).getTime() - new Date(first.date ?? 0).getTime());

   upcomingEvents.sort((first, second) => new Date(first.date ?? 0).getTime() - new Date(second.date ?? 0).getTime());

   const lastEvent = completedEvents[0];
   const nextEvent = upcomingEvents[0];

   const recentForm = completedEvents
      .slice(0, 5)
      .map((event) => getGameResult(event.competitions?.[0]?.competitors ?? [], teamAbbreviation))
      .filter((result): result is "W" | "L" => result !== undefined);

   const standingGroups = standings.children ?? [];
   const allEntries = standingGroups.flatMap((group) => group.standings?.entries ?? []);

   const record = getRecord(allEntries, teamAbbreviation) ?? getTeamCompetitor(lastEvent?.competitions?.[0]?.competitors ?? [], teamAbbreviation)?.records?.[0]?.summary;

   const lastCompetitors = lastEvent?.competitions?.[0]?.competitors ?? [];
   const nextCompetitors = nextEvent?.competitions?.[0]?.competitors ?? [];

   const lastOpponent = getOpponent(lastCompetitors, teamAbbreviation);
   const nextOpponent = getOpponent(nextCompetitors, teamAbbreviation);
   const nextTeam = getTeamCompetitor(nextCompetitors, teamAbbreviation);

   return {
      competition: "NBA",
      record,
      standing: getStanding(standingGroups, teamAbbreviation),
      form: recentForm,
      lastGame: lastEvent
         ? {
              opponent: lastOpponent?.team?.displayName ?? lastOpponent?.team?.abbreviation ?? "Opponent",
              result: getGameResult(lastCompetitors, teamAbbreviation),
              score: getGameScore(lastCompetitors, teamAbbreviation),
              playedAt: normalizeDate(lastEvent.competitions?.[0]?.date ?? lastEvent.date),
              competition: "NBA",
           }
         : undefined,
      nextGame: nextEvent
         ? {
              opponent: nextOpponent?.team?.displayName ?? nextOpponent?.team?.abbreviation ?? "Opponent",
              scheduledAt: normalizeDate(nextEvent.competitions?.[0]?.date ?? nextEvent.date),
              location: nextTeam?.homeAway === "home" ? "Home" : "Away",
              competition: "NBA",
           }
         : undefined,
   };
}
