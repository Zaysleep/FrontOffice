import type { SportsRefreshContext, TeamAdapterInput, TopReportItem } from "../types";

export interface TopReportProviderAdapter {
   readonly providerName: string;
   readonly sport: TeamAdapterInput["sport"];

   supportsTeam(team: TeamAdapterInput): boolean;

   fetchTopReport(team: TeamAdapterInput, context: SportsRefreshContext): Promise<TopReportItem[]>;
}
