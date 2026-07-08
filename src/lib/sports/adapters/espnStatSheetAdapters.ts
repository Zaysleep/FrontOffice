import type { StatSheetProviderAdapter } from "./statSheet";
import { fetchEspnStatSheet } from "./espnStatSheet";

function createEspnStatSheetAdapter({ sport, league }: { sport: StatSheetProviderAdapter["sport"]; league?: string }): StatSheetProviderAdapter {
   return {
      providerName: "ESPN",
      sport,

      supportsTeam(team) {
         return team.sport === sport && (!league || team.league === league);
      },

      fetchStatSheet(team) {
         return fetchEspnStatSheet(team);
      },
   };
}

export const allStatSheetAdapters: StatSheetProviderAdapter[] = [
   createEspnStatSheetAdapter({
      sport: "NBA",
      league: "NBA",
   }),
   createEspnStatSheetAdapter({
      sport: "NFL",
      league: "NFL",
   }),
   createEspnStatSheetAdapter({
      sport: "MLB",
      league: "MLB",
   }),
   createEspnStatSheetAdapter({
      sport: "SOCCER",
      league: "Premier League",
   }),
   createEspnStatSheetAdapter({
      sport: "SOCCER",
      league: "MLS",
   }),
];
