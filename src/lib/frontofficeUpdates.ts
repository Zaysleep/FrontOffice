/**
 * FrontOffice Update Helpers
 *
 * Keeps report, update, and newspaper-brief logic out of page.tsx
 * and the presentation components.
 *
 * Current direction:
 * - Use mock/static data for the MVP
 * - Keep the UI data-driven
 * - Make each newspaper section easy to replace with an API adapter later
 * - Keep live-data integration separate from layout code
 */

import { type Sport, type TeamBrief, type TeamUpdate } from "@/data/frontofficeData";

type GetTeamUpdatesParams = {
   selectedSport: Sport;
   selectedTeam: string;
   currentBrief: TeamBrief;
   allUpdates: TeamUpdate[];
};

export type BulletinItem = {
   label: string;
   value: string;
};

export type MedicalItem = {
   player: string;
   status: string;
   detail: string;
};

export type StatLeader = {
   rank: number;
   player: string;
   value: string;
};

export type RumorItem = {
   label: string;
   value: string;
};

export type NewspaperBriefData = {
   bulletin: BulletinItem[];
   payroll: string;
   flexibility: string;
   medical: MedicalItem[];
   healthIndex: string;
   statLeaders: StatLeader[];
   rumorMill: RumorItem[];
};

/**
 * Gets updates for the selected team.
 *
 * Priority:
 * 1. Direct team updates
 * 2. Sport-wide updates
 * 3. Generated fallback updates
 */
export function getTeamUpdates({ selectedSport, selectedTeam, currentBrief, allUpdates }: GetTeamUpdatesParams): TeamUpdate[] {
   const directUpdates = allUpdates.filter((update) => update.sport === selectedSport && update.team === selectedTeam);

   if (directUpdates.length > 0) {
      return sortUpdatesByNewest(directUpdates);
   }

   const sportUpdates = allUpdates.filter((update) => update.sport === selectedSport);

   if (sportUpdates.length > 0) {
      return sortUpdatesByNewest(sportUpdates);
   }

   return createFallbackUpdates(currentBrief);
}

/**
 * Returns the lead report item for the selected team.
 */
export function getLeadUpdate(teamUpdates: TeamUpdate[]) {
   return teamUpdates[0];
}

/**
 * Builds the five newspaper sections used by the
 * Front Office daily briefing.
 *
 * These values are intentionally isolated here so each section
 * can later be powered by its own live-data adapter.
 */
export function buildNewspaperData(currentBrief: TeamBrief): NewspaperBriefData {
   return {
      bulletin: getBulletinData(currentBrief),
      payroll: getPayrollValue(currentBrief),
      flexibility: getFlexibilityValue(currentBrief),
      medical: getMedicalData(currentBrief),
      healthIndex: getHealthIndex(currentBrief),
      statLeaders: getStatLeaders(currentBrief),
      rumorMill: getRumorMill(currentBrief),
   };
}

/**
 * Creates fallback updates so every selected team still has
 * a useful Top Report before live news APIs are connected.
 */
export function createFallbackUpdates(currentBrief: TeamBrief): TeamUpdate[] {
   const now = new Date().toISOString();

   const league = getLeagueFromSport(currentBrief.sport);

   return [
      {
         id: `fallback-${slugify(currentBrief.team)}-lead`,
         team: currentBrief.team,
         sport: currentBrief.sport,
         league,
         title: buildFallbackHeadline(currentBrief),
         summary: currentBrief.storyline,
         source: "FrontOffice Report",
         category: getPrimaryCategory(currentBrief.sport),
         publishedAt: now,
      },
      {
         id: `fallback-${slugify(currentBrief.team)}-money`,
         team: currentBrief.team,
         sport: currentBrief.sport,
         league,
         title: `${currentBrief.team} money picture remains part of the conversation`,
         summary: `The current report points to ${currentBrief.capStatus.toLowerCase()} as a key factor before any major move.`,
         source: "FrontOffice Report",
         category: "Cap",
         publishedAt: now,
      },
      {
         id: `fallback-${slugify(currentBrief.team)}-pressure`,
         team: currentBrief.team,
         sport: currentBrief.sport,
         league,
         title: `${currentBrief.team} pressure is shaping the room`,
         summary: `The current pressure level is ${currentBrief.fanPressure.toLowerCase()}, which could influence how aggressive the front office should be.`,
         source: "FrontOffice Report",
         category: "Performance",
         publishedAt: now,
      },
   ];
}

/**
 * Produces a stronger newspaper-style fallback headline.
 */
export function buildFallbackHeadline(currentBrief: TeamBrief) {
   return `${currentBrief.team}: ${currentBrief.fanPressure} Defines The Next Move`;
}

/**
 * Produces a compact newspaper-style dateline.
 */
export function getDateline(currentBrief: TeamBrief) {
   if (currentBrief.team === "Los Angeles Lakers" || currentBrief.team === "Los Angeles Chargers") {
      return "Los Angeles Daily —";
   }

   if (currentBrief.team === "Manchester United") {
      return "Manchester Daily —";
   }

   if (currentBrief.team === "San Diego Padres") {
      return "San Diego Daily —";
   }

   return `${currentBrief.team} Daily —`;
}

/**
 * Sorts updates newest first.
 */
export function sortUpdatesByNewest(updates: TeamUpdate[]) {
   return [...updates].sort((firstUpdate, secondUpdate) => new Date(secondUpdate.publishedAt).getTime() - new Date(firstUpdate.publishedAt).getTime());
}

function getBulletinData(currentBrief: TeamBrief): BulletinItem[] {
   if (currentBrief.sport === "NBA") {
      return [
         { label: "Division", value: "3rd" },
         { label: "Record", value: "48–34" },
         { label: "Last 5", value: "3–2" },
         { label: "Streak", value: "W2" },
      ];
   }

   if (currentBrief.sport === "Football") {
      return [
         { label: "Division", value: "2nd" },
         { label: "Record", value: "11–6" },
         { label: "Last 5", value: "4–1" },
         { label: "Streak", value: "W3" },
      ];
   }

   if (currentBrief.sport === "Soccer") {
      return [
         {
            label: "League Position",
            value: "6th",
         },
         { label: "Points", value: "62" },
         {
            label: "Last 5",
            value: "W-D-W-L-W",
         },
         {
            label: "Form",
            value: "Improving",
         },
      ];
   }

   return [
      { label: "Division", value: "2nd" },
      { label: "Record", value: "54–42" },
      { label: "Last 5", value: "4–1" },
      { label: "Streak", value: "W2" },
   ];
}

function getPayrollValue(currentBrief: TeamBrief) {
   if (currentBrief.sport === "NBA") {
      return "$181.2M";
   }

   if (currentBrief.sport === "Football") {
      return "$248.6M";
   }

   if (currentBrief.sport === "Soccer") {
      return "£174M";
   }

   return "$169.4M";
}

function getFlexibilityValue(currentBrief: TeamBrief) {
   const status = currentBrief.capStatus.toLowerCase();

   if (status.includes("pressure") || status.includes("tight")) {
      return "Limited";
   }

   return "Moderate";
}

function getMedicalData(currentBrief: TeamBrief): MedicalItem[] {
   if (currentBrief.sport === "NBA") {
      return [
         {
            player: "Starter A",
            status: "Questionable",
            detail: "Knee soreness · Day-to-day",
         },
         {
            player: "Rotation B",
            status: "Out",
            detail: "Ankle recovery · 1–2 weeks",
         },
      ];
   }

   if (currentBrief.sport === "Football") {
      return [
         {
            player: "Starter A",
            status: "Limited",
            detail: "Shoulder · Practice watch",
         },
         {
            player: "Depth B",
            status: "Out",
            detail: "Hamstring · Week-to-week",
         },
      ];
   }

   if (currentBrief.sport === "Soccer") {
      return [
         {
            player: "First Team A",
            status: "Doubtful",
            detail: "Muscle issue · Match-day decision",
         },
         {
            player: "First Team B",
            status: "Out",
            detail: "Ankle · Return timetable pending",
         },
      ];
   }

   return [
      {
         player: "Starter A",
         status: "Day-to-Day",
         detail: "Shoulder fatigue · Monitoring",
      },
      {
         player: "Reliever B",
         status: "IL",
         detail: "Forearm strain · Rehab assignment",
      },
   ];
}

function getHealthIndex(currentBrief: TeamBrief) {
   if (currentBrief.sport === "NBA") {
      return "78%";
   }

   if (currentBrief.sport === "Football") {
      return "82%";
   }

   if (currentBrief.sport === "Soccer") {
      return "74%";
   }

   return "81%";
}

function getStatLeaders(currentBrief: TeamBrief): StatLeader[] {
   if (currentBrief.sport === "NBA") {
      return [
         {
            rank: 1,
            player: "Player A",
            value: "24.8",
         },
         {
            rank: 2,
            player: "Player B",
            value: "21.3",
         },
         {
            rank: 3,
            player: "Player C",
            value: "19.7",
         },
      ];
   }

   if (currentBrief.sport === "Football") {
      return [
         {
            rank: 1,
            player: "Player A",
            value: "91.4",
         },
         {
            rank: 2,
            player: "Player B",
            value: "88.2",
         },
         {
            rank: 3,
            player: "Player C",
            value: "84.9",
         },
      ];
   }

   if (currentBrief.sport === "Soccer") {
      return [
         {
            rank: 1,
            player: "Player A",
            value: "8.2",
         },
         {
            rank: 2,
            player: "Player B",
            value: "7.8",
         },
         {
            rank: 3,
            player: "Player C",
            value: "7.6",
         },
      ];
   }

   return [
      {
         rank: 1,
         player: "Player A",
         value: "5.4",
      },
      {
         rank: 2,
         player: "Player B",
         value: "4.8",
      },
      {
         rank: 3,
         player: "Player C",
         value: "4.2",
      },
   ];
}

function getRumorMill(currentBrief: TeamBrief): RumorItem[] {
   if (currentBrief.sport === "NBA") {
      return [
         {
            label: "2027 Draft",
            value: "1st Round Pick",
         },
         {
            label: "2028 Draft",
            value: "2nd Round Pick",
         },
         {
            label: "2029 Draft",
            value: "1st Round Pick",
         },
         {
            label: "Contract Watch",
            value: "2 Expiring",
         },
      ];
   }

   if (currentBrief.sport === "Football") {
      return [
         {
            label: "Next Draft",
            value: "7 Picks",
         },
         {
            label: "Premium Picks",
            value: "Rounds 1–3",
         },
         {
            label: "Contract Watch",
            value: "4 Expiring",
         },
         {
            label: "Trade Window",
            value: "Open",
         },
      ];
   }

   if (currentBrief.sport === "Soccer") {
      return [
         {
            label: "Contract Watch",
            value: "3 Expiring",
         },
         {
            label: "Loan Returns",
            value: "4 Players",
         },
         {
            label: "Transfer Need",
            value: "Midfield",
         },
         {
            label: "Market Status",
            value: "Active",
         },
      ];
   }

   return [
      {
         label: "Top Prospects",
         value: "3 Untouchable",
      },
      {
         label: "Deadline Assets",
         value: "Moderate",
      },
      {
         label: "Contract Watch",
         value: "5 Expiring",
      },
      {
         label: "Farm Status",
         value: "Protected",
      },
   ];
}

function getPrimaryCategory(sport: Sport): TeamUpdate["category"] {
   if (sport === "NBA") {
      return "Trade";
   }

   if (sport === "Football") {
      return "Draft";
   }

   if (sport === "Soccer") {
      return "Transfer";
   }

   return "Deadline";
}

function getLeagueFromSport(sport: Sport): TeamUpdate["league"] {
   if (sport === "Football") {
      return "NFL";
   }

   if (sport === "Soccer") {
      return "Premier League";
   }

   if (sport === "Baseball") {
      return "MLB";
   }

   return "NBA";
}

function slugify(value: string) {
   return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
}
