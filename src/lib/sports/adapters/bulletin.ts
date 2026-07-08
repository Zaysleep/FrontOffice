import type { BulletinData, FrontOfficeSport, TeamAdapterInput } from "../types";
import type { SportsRefreshContext } from "../types";

export interface BulletinProviderAdapter {
   readonly providerName: string;
   readonly sport: FrontOfficeSport;

   supportsTeam(team: TeamAdapterInput): boolean;

   fetchBulletin(team: TeamAdapterInput, context: SportsRefreshContext): Promise<BulletinData>;
}
