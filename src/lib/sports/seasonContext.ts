import type { FrontOfficeSport } from "./types";

export type SeasonPhase = "Preseason" | "Regular Season" | "Postseason" | "Offseason";

/**
 * Lightweight presentation context.
 *
 * This does not replace provider-supplied league calendars. It gives the UI a
 * safe fallback when a provider has no upcoming event data.
 */
export function getSeasonPhase(sport: FrontOfficeSport, now = new Date()): SeasonPhase {
   const month = now.getUTCMonth() + 1;

   switch (sport) {
      case "NBA":
         if (month >= 7 && month <= 9) return "Offseason";
         if (month === 10) return "Preseason";
         if (month >= 11 || month <= 4) return "Regular Season";
         return "Postseason";

      case "NFL":
         if (month >= 3 && month <= 7) return "Offseason";
         if (month === 8) return "Preseason";
         if (month >= 9 || month <= 1) return "Regular Season";
         return "Postseason";

      case "MLB":
         if (month >= 4 && month <= 9) return "Regular Season";
         if (month === 10) return "Postseason";
         if (month === 2 || month === 3) return "Preseason";
         return "Offseason";

      case "SOCCER":
         // Premier League-style calendar fallback:
         // June and July are treated as the offseason. August through May
         // are treated as the active league season. Provider calendars can
         // override this later for other soccer leagues and competitions.
         if (month === 6 || month === 7) return "Offseason";
         return "Regular Season";
   }
}
