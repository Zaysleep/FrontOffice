import type { RegisteredTeam } from "../teamRegistry";
import type { TopReportProviderAdapter } from "./topReport";

const topReportAdapters: TopReportProviderAdapter[] = [];

export function registerTopReportAdapter(adapter: TopReportProviderAdapter) {
   if (!topReportAdapters.includes(adapter)) {
      topReportAdapters.push(adapter);
   }
}

export function getTopReportAdapter(team: RegisteredTeam) {
   return topReportAdapters.find((adapter) => adapter.supportsTeam(team));
}
