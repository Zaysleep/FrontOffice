import type { TopReportProviderAdapter } from "./topReport";
import { fetchEspnTopReport } from "./espnTopReport";

function createEspnTopReportAdapter({ sport, league }: { sport: TopReportProviderAdapter["sport"]; league?: string }): TopReportProviderAdapter {
   return {
      providerName: "ESPN",
      sport,

      supportsTeam(team) {
         return team.sport === sport && (!league || team.league === league);
      },

      fetchTopReport(team) {
         return fetchEspnTopReport(team);
      },
   };
}

export const allTopReportAdapters: TopReportProviderAdapter[] = [
   createEspnTopReportAdapter({
      sport: "NBA",
      league: "NBA",
   }),
   createEspnTopReportAdapter({
      sport: "NFL",
      league: "NFL",
   }),
   createEspnTopReportAdapter({
      sport: "MLB",
      league: "MLB",
   }),
   createEspnTopReportAdapter({
      sport: "SOCCER",
      league: "Premier League",
   }),
   createEspnTopReportAdapter({
      sport: "SOCCER",
      league: "MLS",
   }),
];
