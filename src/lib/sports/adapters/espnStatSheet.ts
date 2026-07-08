import type { StatItem, TeamAdapterInput } from "../types";
import { getSeasonCandidates } from "../seasonCandidates";

type MetricRule = {
   label: string;
   keys: string[];
};

type EspnLeagueConfig = {
   sportPath: string;
   leaguePath: string;
   metrics: MetricRule[];
};

type CandidateMetric = {
   name?: string;
   displayName?: string;
   shortDisplayName?: string;
   abbreviation?: string;
   value?: number | string;
   displayValue?: string;
   rankDisplayValue?: string;
};

const ESPN_STAT_CONFIG: Record<TeamAdapterInput["sport"], EspnLeagueConfig> = {
   NBA: {
      sportPath: "basketball",
      leaguePath: "nba",
      metrics: [
         {
            label: "Points / Game",
            keys: ["avgpoints", "pointspergame", "ppg"],
         },
         {
            label: "Rebounds / Game",
            keys: ["avgrebounds", "reboundspergame", "rpg"],
         },
         {
            label: "Assists / Game",
            keys: ["avgassists", "assistspergame", "apg"],
         },
         {
            label: "Field Goal %",
            keys: ["fieldgoalpct", "fieldgoalpercentage", "fgpct"],
         },
      ],
   },
   NFL: {
      sportPath: "football",
      leaguePath: "nfl",
      metrics: [
         {
            label: "Points / Game",
            keys: ["pointspergame", "totalpointspergame"],
         },
         {
            label: "Yards / Game",
            keys: ["yardspergame", "totalyardspergame"],
         },
         {
            label: "Pass Yards / Game",
            keys: ["passingyardspergame", "passyardspergame"],
         },
         {
            label: "Rush Yards / Game",
            keys: ["rushingyardspergame", "rushyardspergame"],
         },
      ],
   },
   MLB: {
      sportPath: "baseball",
      leaguePath: "mlb",
      metrics: [
         {
            label: "Runs / Game",
            keys: ["runspergame", "avgruns"],
         },
         {
            label: "Team AVG",
            keys: ["battingaverage", "avg"],
         },
         {
            label: "Team OPS",
            keys: ["onbaseplusslugging", "ops"],
         },
         {
            label: "Team ERA",
            keys: ["earnedrunaverage", "era"],
         },
      ],
   },
   SOCCER: {
      sportPath: "soccer",
      leaguePath: "eng.1",
      metrics: [
         {
            label: "Goals / Match",
            keys: ["goalspergame", "goalspermatch", "avgoals"],
         },
         {
            label: "Goals Against / Match",
            keys: ["goalsagainstpergame", "goalsagainstpermatch", "avggoalsagainst"],
         },
         {
            label: "Possession",
            keys: ["possessionpct", "possessionpercentage", "possession"],
         },
         {
            label: "Shots on Target / Match",
            keys: ["shotsontargetpergame", "shotsontargetpermatch"],
         },
      ],
   },
};

function normalizeKey(value: string) {
   return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function looksLikeMetric(value: unknown): value is CandidateMetric {
   if (!value || typeof value !== "object") {
      return false;
   }

   const item = value as Record<string, unknown>;

   const hasName = typeof item.name === "string" || typeof item.displayName === "string" || typeof item.shortDisplayName === "string" || typeof item.abbreviation === "string";

   const hasValue = typeof item.displayValue === "string" || typeof item.value === "number" || typeof item.value === "string";

   return hasName && hasValue;
}

function collectMetricsDeep(value: unknown, found: CandidateMetric[] = [], visited = new Set<unknown>()): CandidateMetric[] {
   if (!value || typeof value !== "object") {
      return found;
   }

   if (visited.has(value)) {
      return found;
   }

   visited.add(value);

   if (looksLikeMetric(value)) {
      found.push(value);
   }

   if (Array.isArray(value)) {
      for (const item of value) {
         collectMetricsDeep(item, found, visited);
      }

      return found;
   }

   for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      collectMetricsDeep(nestedValue, found, visited);
   }

   return found;
}

function getMetricName(metric: CandidateMetric) {
   return metric.name ?? metric.displayName ?? metric.shortDisplayName ?? metric.abbreviation ?? "";
}

function getMetricValue(metric: CandidateMetric) {
   if (metric.displayValue && metric.displayValue.trim().length > 0) {
      return metric.displayValue;
   }

   if (typeof metric.value === "number") {
      return Number.isInteger(metric.value) ? metric.value.toString() : metric.value.toFixed(1);
   }

   return metric.value?.toString() ?? "";
}

function findMetric(candidates: CandidateMetric[], rule: MetricRule): CandidateMetric | undefined {
   const normalizedKeys = rule.keys.map(normalizeKey);

   return candidates.find((candidate) => {
      const candidateName = normalizeKey(getMetricName(candidate));

      return normalizedKeys.includes(candidateName);
   });
}

type SoccerStandingStat = {
   name?: string;
   displayName?: string;
   abbreviation?: string;
   displayValue?: string;
   value?: number;
};

type SoccerStandingEntry = {
   team?: {
      abbreviation?: string;
      displayName?: string;
   };
   stats?: SoccerStandingStat[];
};

type SoccerStandingsResponse = {
   children?: Array<{
      standings?: {
         entries?: SoccerStandingEntry[];
      };
   }>;
};

function findSoccerStandingStat(stats: SoccerStandingStat[], keys: string[]) {
   const normalizedKeys = keys.map(normalizeKey);

   return stats.find((stat) => {
      const names = [stat.name, stat.displayName, stat.abbreviation].filter((value): value is string => Boolean(value)).map(normalizeKey);

      return names.some((name) => normalizedKeys.includes(name));
   });
}

function getSoccerNumber(stats: SoccerStandingStat[], keys: string[]) {
   const stat = findSoccerStandingStat(stats, keys);

   if (typeof stat?.value === "number") {
      return stat.value;
   }

   if (stat?.displayValue) {
      const parsed = Number.parseFloat(stat.displayValue);

      if (Number.isFinite(parsed)) {
         return parsed;
      }
   }

   return undefined;
}

function formatPerMatch(total: number | undefined, matchesPlayed: number | undefined) {
   if (typeof total !== "number" || typeof matchesPlayed !== "number" || matchesPlayed <= 0) {
      return undefined;
   }

   return (total / matchesPlayed).toFixed(2);
}

function getSoccerLeaguePath(team: TeamAdapterInput) {
   return team.league === "MLS" ? "usa.1" : "eng.1";
}

async function fetchSoccerStatSheet(team: TeamAdapterInput): Promise<StatItem[]> {
   if (!team.providerTeamKey) {
      return [];
   }

   const seasons = getSeasonCandidates("SOCCER", new Date());

   for (const season of seasons) {
      const leaguePath = getSoccerLeaguePath(team);

      const endpoint = `https://site.api.espn.com/apis/v2/sports/` + `soccer/${leaguePath}/standings?season=${season}`;

      const response = await fetch(endpoint, {
         next: {
            revalidate: 86400,
         },
      });

      if (!response.ok) {
         continue;
      }

      const payload = (await response.json()) as SoccerStandingsResponse;

      const entries = payload.children?.flatMap((group) => group.standings?.entries ?? []) ?? [];

      const teamEntry = entries.find((entry) => entry.team?.abbreviation?.toUpperCase() === team.providerTeamKey?.toUpperCase());

      const stats = teamEntry?.stats ?? [];

      if (stats.length === 0) {
         continue;
      }

      const matchesPlayed = getSoccerNumber(stats, ["gamesPlayed", "matchesPlayed", "played", "gp"]);

      const goalsFor = getSoccerNumber(stats, ["goalsFor", "pointsFor", "gf"]);

      const goalsAgainst = getSoccerNumber(stats, ["goalsAgainst", "pointsAgainst", "ga"]);

      const goalDifference = getSoccerNumber(stats, ["goalDifference", "pointDifferential", "gd"]) ?? (typeof goalsFor === "number" && typeof goalsAgainst === "number" ? goalsFor - goalsAgainst : undefined);

      const wins = getSoccerNumber(stats, ["wins", "w"]);
      const draws = getSoccerNumber(stats, ["ties", "draws", "d"]);
      const losses = getSoccerNumber(stats, ["losses", "l"]);

      const goalsPerMatch = formatPerMatch(goalsFor, matchesPlayed);

      const goalsAgainstPerMatch = formatPerMatch(goalsAgainst, matchesPlayed);

      const record = typeof wins === "number" && typeof draws === "number" && typeof losses === "number" ? `${wins}-${draws}-${losses}` : undefined;

      const items: Array<StatItem | null> = [
         goalsPerMatch
            ? {
                 label: "Goals / Match",
                 value: goalsPerMatch,
              }
            : null,
         goalsAgainstPerMatch
            ? {
                 label: "Goals Against / Match",
                 value: goalsAgainstPerMatch,
              }
            : null,
         typeof goalDifference === "number"
            ? {
                 label: "Goal Difference",
                 value: goalDifference > 0 ? `+${goalDifference}` : goalDifference.toString(),
              }
            : null,
         record
            ? {
                 label: "League Record",
                 value: record,
                 context: "W-D-L",
              }
            : null,
      ];

      const normalizedItems = items.filter((item): item is StatItem => item !== null);

      if (normalizedItems.length > 0) {
         return normalizedItems;
      }
   }

   return [];
}

export async function fetchEspnStatSheet(team: TeamAdapterInput): Promise<StatItem[]> {
   const config = ESPN_STAT_CONFIG[team.sport];

   if (!team.providerTeamKey) {
      return [];
   }

   // ESPN's shared /teams/{id}/statistics endpoint is not
   // used for soccer here. Premier League and MLS both derive
   // a team-level Stat Sheet from their league standings feed.
   if (team.sport === "SOCCER") {
      return fetchSoccerStatSheet(team);
   }

   const endpoint = `https://site.api.espn.com/apis/site/v2/sports/` + `${config.sportPath}/${config.leaguePath}/teams/` + `${encodeURIComponent(team.providerTeamKey)}/statistics`;

   const response = await fetch(endpoint, {
      next: {
         revalidate: 86400,
      },
   });

   if (!response.ok) {
      throw new Error(`${team.league} Stat Sheet request failed with ${response.status}.`);
   }

   const payload = (await response.json()) as unknown;
   const candidates = collectMetricsDeep(payload);

   return config.metrics.flatMap((rule) => {
      const metric = findMetric(candidates, rule);

      if (!metric) {
         return [];
      }

      const value = getMetricValue(metric);

      if (!value) {
         return [];
      }

      return [
         {
            label: rule.label,
            value,
            context: metric.rankDisplayValue,
         },
      ];
   });
}
