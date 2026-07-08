import type { FrontOfficeSectionKey } from "./types";

export const FRONT_OFFICE_REFRESH_MINUTES: Record<FrontOfficeSectionKey, number> = {
   top_report: 30,
   bulletin: 60,
   medical: 60,
   stat_sheet: 24 * 60,
   ledger: 24 * 60,
   rumor_mill: 12 * 60,
};

export function getSectionExpiry(section: FrontOfficeSectionKey, fetchedAt = new Date()) {
   const expiresAt = new Date(fetchedAt);

   expiresAt.setMinutes(expiresAt.getMinutes() + FRONT_OFFICE_REFRESH_MINUTES[section]);

   return expiresAt;
}

export function isSportsCacheFresh(expiresAt: string, now = new Date()) {
   const expiry = new Date(expiresAt);

   return !Number.isNaN(expiry.getTime()) && expiry.getTime() > now.getTime();
}
