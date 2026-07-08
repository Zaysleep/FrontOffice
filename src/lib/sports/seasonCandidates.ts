import type { FrontOfficeSport } from "./types";

export function getSeasonCandidates(sport: FrontOfficeSport, now = new Date()): number[] {
   const year = now.getUTCFullYear();
   const month = now.getUTCMonth() + 1;

   switch (sport) {
      case "NBA":
         // ESPN NBA seasons are commonly labeled by ending year.
         return month >= 10 ? [year + 1, year] : [year, year - 1];

      case "NFL":
         // During the offseason, try the upcoming season first, then the last completed one.
         return [year, year - 1];

      case "MLB":
         return [year, year - 1];

      case "SOCCER": {
         // Premier League seasons are commonly keyed by starting year.
         const currentStartYear = month >= 7 ? year : year - 1;
         return [currentStartYear, currentStartYear - 1];
      }
   }
}
