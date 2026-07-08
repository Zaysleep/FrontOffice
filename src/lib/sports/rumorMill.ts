import type {
   SportsRefreshContext,
   TeamAdapterInput,
} from "./types";

export type RumorMillItem = {
   id: string;
   headline: string;
   summary?: string;
   signal: string;
   source: {
      name: string;
      url?: string;
   };
   publishedAt?: string;
};

export interface RumorMillProviderAdapter {
   readonly providerName: string;
   readonly sport: TeamAdapterInput["sport"];

   supportsTeam(team: TeamAdapterInput): boolean;

   fetchRumorMill(
      team: TeamAdapterInput,
      context: SportsRefreshContext,
   ): Promise<RumorMillItem[]>;
}
