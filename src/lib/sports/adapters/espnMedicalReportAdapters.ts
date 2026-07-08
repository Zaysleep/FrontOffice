import type { MedicalReportProviderAdapter } from "./medicalReport";
import { fetchEspnMedicalReport } from "./espnMedicalReport";

function createEspnMedicalReportAdapter({ sport, league }: { sport: MedicalReportProviderAdapter["sport"]; league?: string }): MedicalReportProviderAdapter {
   return {
      providerName: "ESPN",
      sport,

      supportsTeam(team) {
         return team.sport === sport && (!league || team.league === league);
      },

      fetchMedicalReport(team) {
         return fetchEspnMedicalReport(team);
      },
   };
}

export const allMedicalReportAdapters: MedicalReportProviderAdapter[] = [
   createEspnMedicalReportAdapter({
      sport: "NBA",
      league: "NBA",
   }),
   createEspnMedicalReportAdapter({
      sport: "NFL",
      league: "NFL",
   }),
   createEspnMedicalReportAdapter({
      sport: "MLB",
      league: "MLB",
   }),
   createEspnMedicalReportAdapter({
      sport: "SOCCER",
      league: "Premier League",
   }),
   createEspnMedicalReportAdapter({
      sport: "SOCCER",
      league: "MLS",
   }),
];
