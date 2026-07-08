import type { RumorMillProviderAdapter } from "../rumorMill";
import { fetchEspnRumorMill } from "./espnRumorMill";

function createEspnRumorMillAdapter({ sport, league }: { sport: RumorMillProviderAdapter["sport"]; league?: string }): RumorMillProviderAdapter {
   return {
      providerName: "ESPN",
      sport,

      supportsTeam(team) {
         return team.sport === sport && (!league || team.league === league);
      },

      fetchRumorMill(team) {
         return fetchEspnRumorMill(team);
      },
   };
}

export const allRumorMillAdapters: RumorMillProviderAdapter[] = [
   createEspnRumorMillAdapter({
      sport: "NBA",
      league: "NBA",
   }),
   createEspnRumorMillAdapter({
      sport: "NFL",
      league: "NFL",
   }),
   createEspnRumorMillAdapter({
      sport: "MLB",
      league: "MLB",
   }),
   createEspnRumorMillAdapter({
      sport: "SOCCER",
      league: "Premier League",
   }),
   createEspnRumorMillAdapter({
      sport: "SOCCER",
      league: "MLS",
   }),
];
