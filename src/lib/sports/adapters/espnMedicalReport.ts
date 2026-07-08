import type { AvailabilityItem, TeamAdapterInput } from "../types";
import { getSeasonCandidates } from "../seasonCandidates";

type EspnAthlete = {
   displayName?: string;
   fullName?: string;
   shortName?: string;
};

type EspnInjury = {
   athlete?: EspnAthlete;
   status?: string;
   type?: {
      name?: string;
      description?: string;
      abbreviation?: string;
   };
   details?: {
      type?: string;
      location?: string;
      detail?: string;
      side?: string;
      returnDate?: string;
   };
   shortComment?: string;
   longComment?: string;
   date?: string;
};

type EspnInjuryGroup = {
   date?: string;
   injuries?: EspnInjury[];
   items?: EspnInjury[];
};

type EspnInjuryResponse = {
   injuries?: Array<EspnInjury | EspnInjuryGroup>;
   items?: EspnInjury[];
   team?: {
      injuries?: Array<EspnInjury | EspnInjuryGroup>;
   };
   teams?: EspnInjuryGroup[];
};

type EspnLeagueConfig = {
   sportPath: string;
   leaguePath: string;
   pagePath: string;
};

const ESPN_MEDICAL_CONFIG: Record<TeamAdapterInput["sport"], EspnLeagueConfig> = {
   NBA: {
      sportPath: "basketball",
      leaguePath: "nba",
      pagePath: "nba",
   },
   NFL: {
      sportPath: "football",
      leaguePath: "nfl",
      pagePath: "nfl",
   },
   MLB: {
      sportPath: "baseball",
      leaguePath: "mlb",
      pagePath: "mlb",
   },
   SOCCER: {
      sportPath: "soccer",
      leaguePath: "eng.1",
      pagePath: "soccer",
   },
};

function normalizeAvailabilityType(text: string): AvailabilityItem["availabilityType"] {
   const normalized = text.toLowerCase();

   if (normalized.includes("suspend") || normalized.includes("disciplin")) {
      return "Suspension";
   }

   if (normalized.includes("personal") || normalized.includes("family")) {
      return "Personal";
   }

   if (normalized.includes("injur") || normalized.includes("soreness") || normalized.includes("strain") || normalized.includes("sprain") || normalized.includes("fracture") || normalized.includes("illness")) {
      return "Injury";
   }

   return "Other";
}

function normalizeInjury(injury: EspnInjury): AvailabilityItem | null {
   const player = injury.athlete?.displayName ?? injury.athlete?.fullName ?? injury.athlete?.shortName;

   if (!player) {
      return null;
   }

   const rawStatus = injury.status ?? injury.type?.description ?? injury.type?.name ?? injury.type?.abbreviation ?? "Unavailable";

   const status = /^injury-\d+$/i.test(rawStatus.trim()) ? "Injured" : rawStatus;

   const detailParts = [injury.details?.side, injury.details?.location, injury.details?.type, injury.details?.detail, injury.shortComment, injury.longComment].filter(
      (value, index, values): value is string => Boolean(value) && values.indexOf(value) === index,
   );

   const detail = detailParts.join(" · ") || undefined;

   return {
      player,
      status,
      detail,
      expectedReturn: injury.details?.returnDate,
      availabilityType: normalizeAvailabilityType(`${status} ${detail ?? ""}`),
   };
}

function looksLikeInjury(value: unknown): value is EspnInjury {
   if (!value || typeof value !== "object") {
      return false;
   }

   const item = value as Record<string, unknown>;
   const athlete = item.athlete;

   return Boolean(
      athlete &&
      typeof athlete === "object" &&
      (typeof item.status === "string" || typeof item.shortComment === "string" || typeof item.longComment === "string" || (item.type && typeof item.type === "object") || (item.details && typeof item.details === "object")),
   );
}

function collectInjuriesDeep(value: unknown, found: EspnInjury[] = [], visited = new Set<unknown>()): EspnInjury[] {
   if (!value || typeof value !== "object") {
      return found;
   }

   if (visited.has(value)) {
      return found;
   }

   visited.add(value);

   if (looksLikeInjury(value)) {
      found.push(value);
      return found;
   }

   if (Array.isArray(value)) {
      for (const item of value) {
         collectInjuriesDeep(item, found, visited);
      }

      return found;
   }

   for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      collectInjuriesDeep(nestedValue, found, visited);
   }

   return found;
}

function collectInjuries(payload: EspnInjuryResponse): EspnInjury[] {
   const injuries = collectInjuriesDeep(payload);

   const deduped = new Map<string, EspnInjury>();

   for (const injury of injuries) {
      const player = injury.athlete?.displayName ?? injury.athlete?.fullName ?? injury.athlete?.shortName ?? "unknown";

      const key = [player, injury.status ?? "", injury.date ?? "", injury.shortComment ?? ""].join("|");

      if (!deduped.has(key)) {
         deduped.set(key, injury);
      }
   }

   return Array.from(deduped.values());
}

function slugifyTeamName(teamName: string) {
   return teamName
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
}

function extractBalancedJsonObject(source: string, markerIndex: number): string | null {
   const objectStart = source.indexOf("{", markerIndex);

   if (objectStart === -1) {
      return null;
   }

   let depth = 0;
   let inString = false;
   let escaped = false;

   for (let index = objectStart; index < source.length; index += 1) {
      const character = source[index];

      if (inString) {
         if (escaped) {
            escaped = false;
            continue;
         }

         if (character === "\\") {
            escaped = true;
            continue;
         }

         if (character === '"') {
            inString = false;
         }

         continue;
      }

      if (character === '"') {
         inString = true;
         continue;
      }

      if (character === "{") {
         depth += 1;
         continue;
      }

      if (character === "}") {
         depth -= 1;

         if (depth === 0) {
            return source.slice(objectStart, index + 1);
         }
      }
   }

   return null;
}

function extractEspnFittState(html: string): unknown | null {
   const assignmentPatterns = [/window\[['"]__espnfitt__['"]\]\s*=/g, /window\.__espnfitt__\s*=/g, /__espnfitt__\s*=/g];

   for (const pattern of assignmentPatterns) {
      pattern.lastIndex = 0;

      let match: RegExpExecArray | null;

      while ((match = pattern.exec(html)) !== null) {
         const jsonText = extractBalancedJsonObject(html, match.index + match[0].length);

         if (!jsonText) {
            continue;
         }

         try {
            const parsed = JSON.parse(jsonText);

            // Avoid accidentally accepting the ESPN configuration object.
            // The actual application state is expected to contain page data,
            // while the config object contains keys such as uid/globalVar.
            if (parsed && typeof parsed === "object" && !("uid" in (parsed as Record<string, unknown>) && "globalVar" in (parsed as Record<string, unknown>))) {
               return parsed;
            }
         } catch {
            // Continue to the next assignment candidate.
         }
      }
   }

   return null;
}

function getSoccerLeaguePath(team: TeamAdapterInput) {
   return team.league === "MLS" ? "usa.1" : "eng.1";
}

async function resolveSoccerTeamPageId(team: TeamAdapterInput): Promise<string | null> {
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

      const payload = (await response.json()) as {
         children?: Array<{
            standings?: {
               entries?: Array<{
                  team?: {
                     id?: string | number;
                     abbreviation?: string;
                     displayName?: string;
                     shortDisplayName?: string;
                     name?: string;
                  };
               }>;
            };
         }>;
      };

      const entries = payload.children?.flatMap((group) => group.standings?.entries ?? []) ?? [];

      const providerKey = team.providerTeamKey?.toLowerCase() ?? "";
      const teamName = team.teamName.toLowerCase();

      const match = entries.find((entry) => {
         const candidate = entry.team;

         if (!candidate) {
            return false;
         }

         const candidateAbbreviation = candidate.abbreviation?.toLowerCase() ?? "";

         const candidateNames = [candidate.displayName, candidate.shortDisplayName, candidate.name].filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase());

         return candidateAbbreviation === providerKey || candidateNames.includes(teamName);
      });

      const teamId = match?.team?.id;

      if (teamId !== undefined && teamId !== null) {
         return teamId.toString();
      }
   }

   return null;
}

async function fetchSoccerMedicalReport(team: TeamAdapterInput): Promise<AvailabilityItem[]> {
   const soccerTeamId = await resolveSoccerTeamPageId(team);

   if (!soccerTeamId) {
      throw new Error(`${team.league} medical report team ID could not be resolved.`);
   }

   const providerTeamKey = team.providerTeamKey ?? "";
   const teamSlug = slugifyTeamName(team.teamName);

   const leaguePath = getSoccerLeaguePath(team);

   const jsonEndpoints = [
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${leaguePath}/teams/${encodeURIComponent(soccerTeamId)}/injuries`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${leaguePath}/teams/${encodeURIComponent(providerTeamKey)}/injuries`,
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${leaguePath}/teams/${encodeURIComponent(soccerTeamId)}/roster`,
   ];

   for (const endpoint of jsonEndpoints) {
      const response = await fetch(endpoint, {
         next: {
            revalidate: 3600,
         },
      });

      if (!response.ok) {
         continue;
      }

      const payload = (await response.json()) as unknown;

      const items = collectInjuriesDeep(payload)
         .map(normalizeInjury)
         .filter((item): item is AvailabilityItem => item !== null)
         .slice(0, 8);

      if (items.length > 0) {
         return items;
      }
   }

   const htmlEndpoints = [
      `https://www.espn.com/soccer/team/injuries/_/id/${encodeURIComponent(soccerTeamId)}/${encodeURIComponent(teamSlug)}`,
      `https://www.espn.com/football/team/injuries/_/id/${encodeURIComponent(soccerTeamId)}/${encodeURIComponent(teamSlug)}`,
   ];

   for (const endpoint of htmlEndpoints) {
      const response = await fetch(endpoint, {
         next: {
            revalidate: 3600,
         },
         headers: {
            "User-Agent": "Mozilla/5.0 (compatible; FrontOffice/1.0)",
            Accept: "text/html,application/xhtml+xml",
         },
      });

      if (!response.ok) {
         continue;
      }

      const html = await response.text();
      const state = extractEspnFittState(html);

      if (!state) {
         continue;
      }

      const items = collectInjuriesDeep(state)
         .map(normalizeInjury)
         .filter((item): item is AvailabilityItem => item !== null)
         .slice(0, 8);

      if (items.length > 0) {
         return items;
      }
   }

   // ESPN does not consistently expose soccer availability data
   // through the same route family across every competition. Return
   // an empty normalized report instead of failing the Front Office page.
   return [];
}

export async function fetchEspnMedicalReport(team: TeamAdapterInput): Promise<AvailabilityItem[]> {
   const config = ESPN_MEDICAL_CONFIG[team.sport];
   const providerTeamKey = team.providerTeamKey;

   if (!providerTeamKey) {
      return [];
   }

   if (team.sport === "SOCCER") {
      return fetchSoccerMedicalReport(team);
   }

   const teamSlug = slugifyTeamName(team.teamName);

   const endpoint = `https://www.espn.com/${config.pagePath}/team/injuries/_/name/` + `${encodeURIComponent(providerTeamKey)}/` + `${encodeURIComponent(teamSlug)}`;

   const response = await fetch(endpoint, {
      next: {
         revalidate: 3600,
      },
      headers: {
         "User-Agent": "Mozilla/5.0 (compatible; FrontOffice/1.0)",
         Accept: "text/html,application/xhtml+xml",
      },
   });

   if (!response.ok) {
      throw new Error(`${team.league} medical report page request failed with ${response.status}.`);
   }

   const html = await response.text();
   const state = extractEspnFittState(html);

   if (!state) {
      throw new Error(`${team.league} medical report state could not be found in the ESPN page.`);
   }

   return collectInjuriesDeep(state)
      .map(normalizeInjury)
      .filter((item): item is AvailabilityItem => item !== null)
      .slice(0, 8);
}
