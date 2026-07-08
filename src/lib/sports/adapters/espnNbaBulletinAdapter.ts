import { fetchNbaBulletin } from "./espnNba";
import type { BulletinProviderAdapter } from "./bulletin";
import type { TeamAdapterInput } from "../types";
import { getSeasonPhase } from "../seasonContext";

export const espnNbaBulletinAdapter: BulletinProviderAdapter = {
   providerName: "ESPN",
   sport: "NBA",

   supportsTeam(team: TeamAdapterInput) {
      return team.sport === "NBA";
   },

   async fetchBulletin(team, context) {
      const bulletin = await fetchNbaBulletin({
         teamAbbreviation: team.providerTeamKey ?? team.teamName,
         season: context.now.getUTCFullYear(),
      });

      return {
         ...bulletin,
         seasonPhase: getSeasonPhase("NBA", context.now),
         statusNote: bulletin.nextGame || getSeasonPhase("NBA", context.now) !== "Offseason" ? undefined : "Schedule not yet available",
      };
   },
};
