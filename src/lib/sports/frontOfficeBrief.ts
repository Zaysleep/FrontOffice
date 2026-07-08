import type {
   AvailabilityItem,
   BulletinData,
   LedgerItem,
   RumorItem,
   StatItem,
   TeamFrontOfficeBrief,
   TopReportItem,
} from "./types";

export type FrontOfficeBriefSections = {
   topReport?: TopReportItem[];
   bulletin?: BulletinData;
   medicalReport?: AvailabilityItem[];
   statSheet?: StatItem[];
   ledger?: LedgerItem[];
   rumorMill?: RumorItem[];
};

/**
 * Build a safe normalized brief even when one provider section is missing.
 * The UI can render partial data without crashing or inventing facts.
 */
export function buildTeamFrontOfficeBrief({
   teamId,
   providerTeamKey,
   teamName,
   abbreviation,
   sport,
   league,
   competitions,
   sections,
   updatedAt,
   sourceUpdatedAt,
}: {
   teamId: string;
   providerTeamKey?: string;
   teamName: string;
   abbreviation?: string;
   sport: TeamFrontOfficeBrief["sport"];
   league: string;
   competitions?: string[];
   sections: FrontOfficeBriefSections;
   updatedAt?: string;
   sourceUpdatedAt?: string;
}): TeamFrontOfficeBrief {
   return {
      teamId,
      providerTeamKey,
      teamName,
      abbreviation,
      sport,
      league,
      competitions,
      topReport: sections.topReport ?? [],
      bulletin: sections.bulletin ?? {},
      medicalReport: sections.medicalReport ?? [],
      statSheet: sections.statSheet ?? [],
      ledger: sections.ledger ?? [],
      rumorMill: sections.rumorMill ?? [],
      updatedAt: updatedAt ?? new Date().toISOString(),
      sourceUpdatedAt,
   };
}
