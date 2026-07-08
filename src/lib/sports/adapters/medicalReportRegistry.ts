import type { RegisteredTeam } from "../teamRegistry";
import type { MedicalReportProviderAdapter } from "./medicalReport";

const medicalReportAdapters: MedicalReportProviderAdapter[] = [];

export function registerMedicalReportAdapter(adapter: MedicalReportProviderAdapter) {
   if (!medicalReportAdapters.includes(adapter)) {
      medicalReportAdapters.push(adapter);
   }
}

export function getMedicalReportAdapter(team: RegisteredTeam) {
   return medicalReportAdapters.find((adapter) => adapter.supportsTeam(team));
}
