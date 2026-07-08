import type {
   SportsRefreshContext,
   StatItem,
   TeamAdapterInput,
} from "../types";

export interface StatSheetProviderAdapter {
   readonly providerName: string;
   readonly sport: TeamAdapterInput["sport"];

   supportsTeam(team: TeamAdapterInput): boolean;

   fetchStatSheet(
      team: TeamAdapterInput,
      context: SportsRefreshContext,
   ): Promise<StatItem[]>;
}
