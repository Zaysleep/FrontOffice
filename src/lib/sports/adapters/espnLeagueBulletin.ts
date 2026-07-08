import type { BulletinData, FrontOfficeSport } from "../types";

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

export type EspnLeagueConfig = {
   sport: FrontOfficeSport;
   sportPath: string;
   leaguePath: string;
   competitionLabel: string;
};

function normalizeDate(value?: string) {
   if (!value) return undefined;

   const date = new Date(value);
   return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function getTeamCompetitor(
   competitors: EspnCompetitor[],
   teamAbbreviation: string,
) {
   return competitors.find(
      (competitor) =>
         competitor.team?.abbreviation?.toUpperCase() ===
         teamAbbreviation.toUpperCase(),
   );
}

function getOpponent(
   competitors: EspnCompetitor[],
   teamAbbreviation: string,
) {
   return competitors.find(
      (competitor) =>
         competitor.team?.abbreviation?.toUpperCase() !==
         teamAbbreviation.toUpperCase(),
   );
}

function getGameResult(
   competitors: EspnCompetitor[],
   teamAbbreviation: string,
) {
   const team = getTeamCompetitor(competitors, teamAbbreviation);

   if (typeof team?.winner !== "boolean") {
      return undefined;
   }

   return team.winner ? "W" : "L";
}

function getGameScore(
   competitors: EspnCompetitor[],
   teamAbbreviation: string,
) {
   const team = getTeamCompetitor(competitors, teamAbbreviation);
   const opponent = getOpponent(competitors, teamAbbreviation);

   if (!team?.score || !opponent?.score) {
      return undefined;
   }

   return `${team.score}-${opponent.score}`;
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

function getRecord(
   entries: EspnStandingEntry[],
   teamAbbreviation: string,
) {
   const entry = entries.find(
      (item) =>
         item.team?.abbreviation?.toUpperCase() ===
         teamAbbreviation.toUpperCase(),
   );

   const recordStat = entry?.stats?.find(
      (stat) =>
         stat.name === "overall" ||
         stat.displayName === "Overall" ||
         stat.name === "record",
   );

   return recordStat?.displayValue;
}

function getStanding(
   groups: EspnStandingsChild[],
   teamAbbreviation: string,
) {
   for (const group of groups) {
      const entries = group.standings?.entries ?? [];

      const entry = entries.find(
         (item) =>
            item.team?.abbreviation?.toUpperCase() ===
            teamAbbreviation.toUpperCase(),
      );

      if (!entry) {
         continue;
      }

      const standingStat = entry.stats?.find(
         (stat) =>
            stat.name === "playoffSeed" ||
            stat.name === "rank" ||
            stat.name === "leagueStanding" ||
            stat.displayName === "Playoff Seed" ||
            stat.displayName === "Rank" ||
            stat.displayName === "Position",
      );

      const standingValue =
         standingStat?.value ??
         (standingStat?.displayValue
            ? Number.parseInt(standingStat.displayValue, 10)
            : undefined);

      if (
         typeof standingValue === "number" &&
         Number.isFinite(standingValue) &&
         standingValue > 0
      ) {
         return `${ordinal(Math.trunc(standingValue))} in ${
            group.name ?? "Standings"
         }`;
      }
   }

   return undefined;
}

export async function fetchEspnLeagueBulletin({
   config,
   teamAbbreviation,
   seasonCandidates,
}: {
   config: EspnLeagueConfig;
   teamAbbreviation: string;
   seasonCandidates: number[];
}): Promise<BulletinData> {
   let lastError: Error | null = null;

   for (const season of seasonCandidates) {
      try {
         const siteBase =
            `https://site.api.espn.com/apis/site/v2/sports/` +
            `${config.sportPath}/${config.leaguePath}`;

         const standingsBase =
            `https://site.api.espn.com/apis/v2/sports/` +
            `${config.sportPath}/${config.leaguePath}`;

         const [scheduleResponse, standingsResponse] = await Promise.all([
            fetch(
               `${siteBase}/teams/${teamAbbreviation.toLowerCase()}/schedule?season=${season}`,
               { next: { revalidate: 3600 } },
            ),
            fetch(
               `${standingsBase}/standings?season=${season}`,
               { next: { revalidate: 3600 } },
            ),
         ]);

         if (!scheduleResponse.ok && !standingsResponse.ok) {
            throw new Error(
               `${config.competitionLabel} provider requests failed.`,
            );
         }

         const schedule = scheduleResponse.ok
            ? ((await scheduleResponse.json()) as EspnScheduleResponse)
            : ({ events: [] } satisfies EspnScheduleResponse);

         const standings = standingsResponse.ok
            ? ((await standingsResponse.json()) as EspnStandingsResponse)
            : ({ children: [] } satisfies EspnStandingsResponse);

         const events = schedule.events ?? [];
         const completedEvents = events
            .filter((event) => event.status?.type?.completed === true)
            .sort(
               (first, second) =>
                  new Date(second.date ?? 0).getTime() -
                  new Date(first.date ?? 0).getTime(),
            );

         const upcomingEvents = events
            .filter(
               (event) =>
                  event.status?.type?.completed !== true &&
                  event.date &&
                  new Date(event.date).getTime() >= Date.now(),
            )
            .sort(
               (first, second) =>
                  new Date(first.date ?? 0).getTime() -
                  new Date(second.date ?? 0).getTime(),
            );

         const groups = standings.children ?? [];
         const allEntries = groups.flatMap(
            (group) => group.standings?.entries ?? [],
         );

         const lastEvent = completedEvents[0];
         const nextEvent = upcomingEvents[0];
         const lastCompetitors =
            lastEvent?.competitions?.[0]?.competitors ?? [];
         const nextCompetitors =
            nextEvent?.competitions?.[0]?.competitors ?? [];

         const recentForm = completedEvents
            .slice(0, 5)
            .map((event) =>
               getGameResult(
                  event.competitions?.[0]?.competitors ?? [],
                  teamAbbreviation,
               ),
            )
            .filter(
               (result): result is "W" | "L" =>
                  result !== undefined,
            );

         const record =
            getRecord(allEntries, teamAbbreviation) ??
            getTeamCompetitor(lastCompetitors, teamAbbreviation)
               ?.records?.[0]?.summary;

         const bulletin: BulletinData = {
            competition: config.competitionLabel,
            record,
            standing: getStanding(groups, teamAbbreviation),
            form: recentForm,
            lastGame: lastEvent
               ? {
                    opponent:
                       getOpponent(lastCompetitors, teamAbbreviation)?.team
                          ?.displayName ??
                       getOpponent(lastCompetitors, teamAbbreviation)?.team
                          ?.abbreviation ??
                       "Opponent",
                    result: getGameResult(
                       lastCompetitors,
                       teamAbbreviation,
                    ),
                    score: getGameScore(
                       lastCompetitors,
                       teamAbbreviation,
                    ),
                    playedAt: normalizeDate(
                       lastEvent.competitions?.[0]?.date ??
                          lastEvent.date,
                    ),
                    competition: config.competitionLabel,
                 }
               : undefined,
            nextGame: nextEvent
               ? {
                    opponent:
                       getOpponent(nextCompetitors, teamAbbreviation)?.team
                          ?.displayName ??
                       getOpponent(nextCompetitors, teamAbbreviation)?.team
                          ?.abbreviation ??
                       "Opponent",
                    scheduledAt: normalizeDate(
                       nextEvent.competitions?.[0]?.date ??
                          nextEvent.date,
                    ),
                    location:
                       getTeamCompetitor(
                          nextCompetitors,
                          teamAbbreviation,
                       )?.homeAway === "home"
                          ? "Home"
                          : "Away",
                    competition: config.competitionLabel,
                 }
               : undefined,
         };

         if (
            bulletin.record ||
            bulletin.standing ||
            bulletin.lastGame ||
            bulletin.nextGame ||
            bulletin.form?.length
         ) {
            return bulletin;
         }
      } catch (error) {
         lastError =
            error instanceof Error
               ? error
               : new Error("Sports provider request failed.");
      }
   }

   if (lastError) {
      throw lastError;
   }

   return {
      competition: config.competitionLabel,
      form: [],
   };
}
