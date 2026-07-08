/**
 * FrontOffice sports intelligence contracts.
 *
 * The UI consumes these normalized objects only.
 * Provider-specific response shapes should stay inside adapters.
 */

export type FrontOfficeSport = "NBA" | "NFL" | "MLB" | "SOCCER";

export type FrontOfficeSectionKey = "top_report" | "bulletin" | "medical" | "stat_sheet" | "ledger" | "rumor_mill";

export type ReportClassification = "Confirmed" | "Reported" | "Rumor";

export type SourceAttribution = {
   name: string;
   url?: string;
};

export type TopReportItem = {
   id: string;
   headline: string;
   summary: string;
   source?: SourceAttribution;
   publishedAt?: string;
};

export type BulletinData = {
   competition?: string;
   seasonPhase?: "Preseason" | "Regular Season" | "Postseason" | "Offseason";
   statusNote?: string;
   standing?: string;
   record?: string;
   points?: number;
   streak?: string;
   form?: string[];
   lastGame?: {
      opponent: string;
      result?: string;
      score?: string;
      playedAt?: string;
      competition?: string;
   };
   nextGame?: {
      opponent: string;
      scheduledAt?: string;
      location?: "Home" | "Away" | "Neutral";
      competition?: string;
   };
   extra?: Array<{
      label: string;
      value: string;
   }>;
};

export type AvailabilityItem = {
   player: string;
   status: string;
   detail?: string;
   expectedReturn?: string;
   availabilityType?: "Injury" | "Suspension" | "Personal" | "Other";
};

export type StatItem = {
   label: string;
   value: string;
   context?: string;
};

export type LedgerItem = {
   label: string;
   value: string;
   context?: string;
};

export type RumorItem = {
   id: string;
   headline: string;
   classification: ReportClassification;
   summary?: string;
   source?: SourceAttribution;
   publishedAt?: string;
};

export type TeamFrontOfficeBrief = {
   teamId: string;
   providerTeamKey?: string;
   teamName: string;
   abbreviation?: string;
   sport: FrontOfficeSport;
   league: string;
   competitions?: string[];

   topReport: TopReportItem[];
   bulletin: BulletinData;
   medicalReport: AvailabilityItem[];
   statSheet: StatItem[];
   ledger: LedgerItem[];
   rumorMill: RumorItem[];

   updatedAt: string;
   sourceUpdatedAt?: string;
};

export type CachedSportsSection<TPayload = unknown> = {
   teamId: string;
   section: FrontOfficeSectionKey;
   payload: TPayload;
   provider?: string;
   fetchedAt: string;
   expiresAt: string;
};

export type TeamAdapterInput = {
   teamId: string;
   teamName: string;
   sport: FrontOfficeSport;
   league: string;
   providerTeamKey?: string;
   competitions?: string[];
};

export type SportsRefreshContext = {
   now: Date;
   force?: boolean;
};
