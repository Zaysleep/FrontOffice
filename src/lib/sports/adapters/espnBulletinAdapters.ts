import type { BulletinProviderAdapter } from "./bulletin";
import { fetchEspnLeagueBulletin } from "./espnLeagueBulletin";
import { getSeasonCandidates } from "../seasonCandidates";
import { getSeasonPhase } from "../seasonContext";

function createEspnBulletinAdapter({
   providerName,
   sport,
   league,
   sportPath,
   leaguePath,
   competitionLabel,
}: {
   providerName: string;
   sport: BulletinProviderAdapter["sport"];
   league?: string;
   sportPath: string;
   leaguePath: string;
   competitionLabel: string;
}): BulletinProviderAdapter {
   return {
      providerName,
      sport,

      supportsTeam(team) {
         return team.sport === sport && (!league || team.league === league);
      },

      async fetchBulletin(team, context) {
         const bulletin = await fetchEspnLeagueBulletin({
            config: {
               sport,
               sportPath,
               leaguePath,
               competitionLabel,
            },
            teamAbbreviation: team.providerTeamKey ?? team.teamName,
            seasonCandidates: getSeasonCandidates(sport, context.now),
         });

         const seasonPhase = getSeasonPhase(sport, context.now);

         const isEmptySoccerTable = sport === "SOCCER" && bulletin.record === "0-0-0";

         return {
            ...bulletin,
            record: isEmptySoccerTable ? undefined : bulletin.record,
            standing: isEmptySoccerTable ? undefined : bulletin.standing,
            seasonPhase,
            statusNote: bulletin.nextGame || seasonPhase !== "Offseason" ? undefined : "Schedule not yet available",
         };
      },
   };
}

export const espnNbaBulletinAdapter = createEspnBulletinAdapter({
   providerName: "ESPN",
   sport: "NBA",
   league: "NBA",
   sportPath: "basketball",
   leaguePath: "nba",
   competitionLabel: "NBA",
});

export const espnNflBulletinAdapter = createEspnBulletinAdapter({
   providerName: "ESPN",
   sport: "NFL",
   league: "NFL",
   sportPath: "football",
   leaguePath: "nfl",
   competitionLabel: "NFL",
});

export const espnMlbBulletinAdapter = createEspnBulletinAdapter({
   providerName: "ESPN",
   sport: "MLB",
   league: "MLB",
   sportPath: "baseball",
   leaguePath: "mlb",
   competitionLabel: "MLB",
});

export const espnPremierLeagueBulletinAdapter = createEspnBulletinAdapter({
   providerName: "ESPN",
   sport: "SOCCER",
   league: "Premier League",
   sportPath: "soccer",
   leaguePath: "eng.1",
   competitionLabel: "Premier League",
});

export const espnMlsBulletinAdapter = createEspnBulletinAdapter({
   providerName: "ESPN",
   sport: "SOCCER",
   league: "MLS",
   sportPath: "soccer",
   leaguePath: "usa.1",
   competitionLabel: "MLS",
});

export const allBulletinAdapters = [espnNbaBulletinAdapter, espnNflBulletinAdapter, espnMlbBulletinAdapter, espnPremierLeagueBulletinAdapter, espnMlsBulletinAdapter];
