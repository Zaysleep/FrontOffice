import type { LedgerItem } from "../ledger";
import type { TeamAdapterInput } from "../types";

type EspnNewsArticle = {
   id?: string | number;
   headline?: string;
   description?: string;
   published?: string;
   lastModified?: string;
   categories?: Array<{
      description?: string;
   }>;
   links?: {
      web?: {
         href?: string;
      };
      mobile?: {
         href?: string;
      };
   };
};

type EspnNewsResponse = {
   articles?: EspnNewsArticle[];
};

type EspnNewsLeagueConfig = {
   sportPath: string;
   leaguePath: string;
};

const ESPN_NEWS_CONFIG: Record<TeamAdapterInput["sport"], EspnNewsLeagueConfig> = {
   NBA: {
      sportPath: "basketball",
      leaguePath: "nba",
   },
   NFL: {
      sportPath: "football",
      leaguePath: "nfl",
   },
   MLB: {
      sportPath: "baseball",
      leaguePath: "mlb",
   },
   SOCCER: {
      sportPath: "soccer",
      leaguePath: "eng.1",
   },
};

const CONFIRMED_LEDGER_TERMS: Record<TeamAdapterInput["sport"], string[]> = {
   NBA: ["signed", "signs", "re-signed", "re-signs", "extension", "waived", "released", "traded", "acquired", "option exercised", "converted contract"],
   NFL: ["signed", "signs", "re-signed", "re-signs", "extension", "waived", "released", "traded", "acquired", "activated", "claimed", "placed on injured reserve"],
   MLB: ["signed", "signs", "re-signed", "re-signs", "extension", "traded", "acquired", "claimed", "designated for assignment", "optioned", "recalled", "activated"],
   SOCCER: ["signed", "signs", "joins", "joined", "transfer completed", "completed transfer", "loan move", "loan deal", "contract extension", "new contract", "released", "departs", "departure"],
};

const SPECULATION_TERMS = ["could", "might", "may ", "reportedly", "interested in", "target", "linked with", "linked to", "expected to", "considering", "weighing", "rumor", "rumour"];

function getEspnNewsConfig(team: TeamAdapterInput): EspnNewsLeagueConfig {
   if (team.sport === "SOCCER" && team.league === "MLS") {
      return {
         sportPath: "soccer",
         leaguePath: "usa.1",
      };
   }

   return ESPN_NEWS_CONFIG[team.sport];
}

function articleMatchesTeam(article: EspnNewsArticle, team: TeamAdapterInput) {
   const teamName = team.teamName.toLowerCase();
   const abbreviation = team.providerTeamKey?.toLowerCase() ?? "";

   const articleText = [article.headline, article.description].filter(Boolean).join(" ").toLowerCase();

   const categoryNames = (article.categories ?? []).map((category) => category.description?.toLowerCase()).filter((value): value is string => typeof value === "string");

   return articleText.includes(teamName) || categoryNames.includes(teamName) || (abbreviation.length >= 2 && categoryNames.includes(abbreviation));
}

function articleLooksConfirmed(article: EspnNewsArticle, sport: TeamAdapterInput["sport"]) {
   const text = [article.headline, article.description].filter(Boolean).join(" ").toLowerCase();

   const hasConfirmedTerm = CONFIRMED_LEDGER_TERMS[sport].some((term) => text.includes(term));

   const hasSpeculationTerm = SPECULATION_TERMS.some((term) => text.includes(term));

   return hasConfirmedTerm && !hasSpeculationTerm;
}

function getLedgerLabel(article: EspnNewsArticle, sport: TeamAdapterInput["sport"]) {
   const text = [article.headline, article.description].filter(Boolean).join(" ").toLowerCase();

   if (sport === "SOCCER" && ["transfer", "joins", "joined", "loan"].some((term) => text.includes(term))) {
      return "Transfer";
   }

   if (["trade", "traded", "acquired"].some((term) => text.includes(term))) {
      return "Transaction";
   }

   if (["contract", "extension", "signed", "signs", "re-signed", "re-signs"].some((term) => text.includes(term))) {
      return "Contract";
   }

   return "Roster Move";
}

function normalizeArticle(article: EspnNewsArticle, sport: TeamAdapterInput["sport"]): LedgerItem | null {
   if (!article.headline) {
      return null;
   }

   return {
      id: article.id?.toString() ?? `${article.headline}-${article.published ?? article.lastModified ?? ""}`,
      label: getLedgerLabel(article, sport),
      value: article.headline,
      context: article.description,
      source: {
         name: "ESPN",
         url: article.links?.web?.href ?? article.links?.mobile?.href,
      },
      publishedAt: article.published ?? article.lastModified,
   };
}

export async function fetchEspnLedger(team: TeamAdapterInput): Promise<LedgerItem[]> {
   const config = getEspnNewsConfig(team);

   const endpoint = `https://site.api.espn.com/apis/site/v2/sports/` + `${config.sportPath}/${config.leaguePath}/news?limit=100`;

   const response = await fetch(endpoint, {
      next: {
         revalidate: 86400,
      },
   });

   if (!response.ok) {
      throw new Error(`${team.league} Ledger request failed with ${response.status}.`);
   }

   const payload = (await response.json()) as EspnNewsResponse;

   return (payload.articles ?? [])
      .filter((article) => articleMatchesTeam(article, team))
      .filter((article) => articleLooksConfirmed(article, team.sport))
      .map((article) => normalizeArticle(article, team.sport))
      .filter((item): item is LedgerItem => item !== null)
      .slice(0, 4);
}
