import type { RegisteredTeam } from "../teamRegistry";
import type { RumorMillProviderAdapter } from "../rumorMill";

const rumorMillAdapters: RumorMillProviderAdapter[] = [];

export function registerRumorMillAdapter(adapter: RumorMillProviderAdapter) {
   if (!rumorMillAdapters.includes(adapter)) {
      rumorMillAdapters.push(adapter);
   }
}

export function getRumorMillAdapter(team: RegisteredTeam) {
   return rumorMillAdapters.find((adapter) => adapter.supportsTeam(team));
}
