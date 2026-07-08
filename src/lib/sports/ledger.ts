import type {
   SportsRefreshContext,
   TeamAdapterInput,
} from "./types";

export type LedgerItem = {
   id: string;
   label: string;
   value: string;
   context?: string;
   source?: {
      name: string;
      url?: string;
   };
   publishedAt?: string;
};

export interface LedgerProviderAdapter {
   readonly providerName: string;
   readonly sport: TeamAdapterInput["sport"];

   supportsTeam(team: TeamAdapterInput): boolean;

   fetchLedger(
      team: TeamAdapterInput,
      context: SportsRefreshContext,
   ): Promise<LedgerItem[]>;
}
