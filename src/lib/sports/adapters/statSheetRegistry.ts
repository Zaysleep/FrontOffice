import type { RegisteredTeam } from "../teamRegistry";
import type { StatSheetProviderAdapter } from "./statSheet";

const statSheetAdapters: StatSheetProviderAdapter[] = [];

export function registerStatSheetAdapter(adapter: StatSheetProviderAdapter) {
   if (!statSheetAdapters.includes(adapter)) {
      statSheetAdapters.push(adapter);
   }
}

export function getStatSheetAdapter(team: RegisteredTeam) {
   return statSheetAdapters.find((adapter) => adapter.supportsTeam(team));
}
