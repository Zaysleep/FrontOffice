import type { LedgerProviderAdapter } from "../ledger";
import type { TeamAdapterInput } from "../types";
import { fetchEspnLedger } from "./espnLedger";

function createEspnLedgerAdapter({ sport, league }: { sport: TeamAdapterInput["sport"]; league?: string }): LedgerProviderAdapter {
   return {
      providerName: "ESPN",
      sport,

      supportsTeam(team) {
         return team.sport === sport && (!league || team.league === league);
      },

      async fetchLedger(team) {
         return fetchEspnLedger(team);
      },
   };
}

export const allLedgerAdapters: LedgerProviderAdapter[] = [
   createEspnLedgerAdapter({
      sport: "NBA",
      league: "NBA",
   }),
   createEspnLedgerAdapter({
      sport: "NFL",
      league: "NFL",
   }),
   createEspnLedgerAdapter({
      sport: "MLB",
      league: "MLB",
   }),
   createEspnLedgerAdapter({
      sport: "SOCCER",
      league: "Premier League",
   }),
   createEspnLedgerAdapter({
      sport: "SOCCER",
      league: "MLS",
   }),
];
