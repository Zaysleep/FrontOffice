import type {
   AvailabilityItem,
   SportsRefreshContext,
   TeamAdapterInput,
} from "../types";

export interface MedicalReportProviderAdapter {
   readonly providerName: string;
   readonly sport: TeamAdapterInput["sport"];

   supportsTeam(team: TeamAdapterInput): boolean;

   fetchMedicalReport(
      team: TeamAdapterInput,
      context: SportsRefreshContext,
   ): Promise<AvailabilityItem[]>;
}
