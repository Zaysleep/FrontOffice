import type { AvailabilityItem, BulletinData, LedgerItem, RumorItem, SportsRefreshContext, StatItem, TeamAdapterInput, TopReportItem } from "../types";

/**
 * Provider adapters translate external sports data into FrontOffice's
 * provider-independent section contracts.
 */
export interface SportsProviderAdapter {
   readonly providerName: string;

   supportsTeam(team: TeamAdapterInput): boolean;

   fetchTopReport(team: TeamAdapterInput, context: SportsRefreshContext): Promise<TopReportItem[]>;

   fetchBulletin(team: TeamAdapterInput, context: SportsRefreshContext): Promise<BulletinData>;

   fetchMedicalReport(team: TeamAdapterInput, context: SportsRefreshContext): Promise<AvailabilityItem[]>;

   fetchStatSheet(team: TeamAdapterInput, context: SportsRefreshContext): Promise<StatItem[]>;

   fetchLedger(team: TeamAdapterInput, context: SportsRefreshContext): Promise<LedgerItem[]>;

   fetchRumorMill(team: TeamAdapterInput, context: SportsRefreshContext): Promise<RumorItem[]>;
}

/**
 * A provider may implement only part of the FrontOffice brief.
 * This lets us combine structured sports data, news, and finance sources.
 */
export type PartialSportsProviderAdapter = {
   readonly providerName: string;
   supportsTeam(team: TeamAdapterInput): boolean;
   fetchTopReport?: SportsProviderAdapter["fetchTopReport"];
   fetchBulletin?: SportsProviderAdapter["fetchBulletin"];
   fetchMedicalReport?: SportsProviderAdapter["fetchMedicalReport"];
   fetchStatSheet?: SportsProviderAdapter["fetchStatSheet"];
   fetchLedger?: SportsProviderAdapter["fetchLedger"];
   fetchRumorMill?: SportsProviderAdapter["fetchRumorMill"];
};
