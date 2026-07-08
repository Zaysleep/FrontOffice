import type { BulletinProviderAdapter } from "./bulletin";
import type { RegisteredTeam } from "../teamRegistry";

const bulletinAdapters: BulletinProviderAdapter[] = [];

export function registerBulletinAdapter(adapter: BulletinProviderAdapter) {
   if (!bulletinAdapters.includes(adapter)) {
      bulletinAdapters.push(adapter);
   }
}

export function getBulletinAdapter(team: RegisteredTeam) {
   return bulletinAdapters.find((adapter) => adapter.sport === team.sport && adapter.supportsTeam(team));
}
