import type { LedgerProviderAdapter } from "../ledger";
import type { RegisteredTeam } from "../teamRegistry";

const ledgerAdapters: LedgerProviderAdapter[] = [];

export function registerLedgerAdapter(adapter: LedgerProviderAdapter) {
   if (!ledgerAdapters.includes(adapter)) {
      ledgerAdapters.push(adapter);
   }
}

export function getLedgerAdapter(team: RegisteredTeam) {
   return ledgerAdapters.find((adapter) => adapter.supportsTeam(team));
}
