import type { TeamAdapterInput } from "../types";
import type { RumorMillItem } from "../rumorMill";

type EspnNewsLink = {
   href?: string;
};

type EspnNewsCategory = {
   description?: string;
   type?: string;
};

type EspnNewsArticle = {
   id?: number | string;
   headline?: string;
   description?: string;
   published?: string;
   lastModified?: string;
   links?: {
      web?: EspnNewsLink;
      mobile?: EspnNewsLink;
   };
   categories?: EspnNewsCategory[];
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

const UNIVERSAL_RUMOR_TERMS = ["trade", "deal", "contract", "extension", "free agent", "free agency", "signing", "sign ", "waive", "release", "acquire", "target", "interest", "linked", "talks", "negotiat", "pursuit"];

const SPORT_RUMOR_TERMS: Record<TeamAdapterInput["sport"], string[]> = {
   NBA: ["trade deadline", "buyout", "draft", "cap space", "sign-and-trade"],
   NFL: ["franchise tag", "draft", "roster move", "cap space", "restructure"],
   MLB: ["trade deadline", "waivers", "minor league deal", "arbitration", "option"],
   SOCCER: ["transfer", "loan", "bid", "fee", "window", "personal terms"],
};

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

function articleLooksLikeRumor(article: EspnNewsArticle, sport: TeamAdapterInput["sport"]) {
   const text = [article.headline, article.description].filter(Boolean).join(" ").toLowerCase();

   const terms = [...UNIVERSAL_RUMOR_TERMS, ...SPORT_RUMOR_TERMS[sport]];

   return terms.some((term) => text.includes(term));
}

function getRumorSignal(article: EspnNewsArticle, sport: TeamAdapterInput["sport"]) {
   const text = [article.headline, article.description].filter(Boolean).join(" ").toLowerCase();

   if (sport === "SOCCER" && ["transfer", "loan", "bid", "fee", "window"].some((term) => text.includes(term))) {
      return "Transfer Watch";
   }

   if (["trade", "acquire", "deadline"].some((term) => text.includes(term))) {
      return "Trade Watch";
   }

   if (["contract", "extension", "free agent", "signing", "sign "].some((term) => text.includes(term))) {
      return "Contract Watch";
   }

   if (["draft", "waive", "release", "roster"].some((term) => text.includes(term))) {
      return "Roster Watch";
   }

   return "Market Watch";
}

function normalizeArticle(article: EspnNewsArticle, sport: TeamAdapterInput["sport"]): RumorMillItem | null {
   if (!article.headline) {
      return null;
   }

   const articleId = article.id?.toString() ?? `${article.headline}-${article.published ?? article.lastModified ?? ""}`;

   return {
      id: articleId,
      headline: article.headline,
      summary: article.description,
      signal: getRumorSignal(article, sport),
      source: {
         name: "ESPN",
         url: article.links?.web?.href ?? article.links?.mobile?.href,
      },
      publishedAt: article.published ?? article.lastModified,
   };
}

export async function fetchEspnRumorMill(team: TeamAdapterInput): Promise<RumorMillItem[]> {
   const config = getEspnNewsConfig(team);

   const endpoint = `https://site.api.espn.com/apis/site/v2/sports/` + `${config.sportPath}/${config.leaguePath}/news?limit=100`;

   const response = await fetch(endpoint, {
      next: {
         revalidate: 43200,
      },
   });

   if (!response.ok) {
      throw new Error(`${team.league} Rumor Mill request failed with ${response.status}.`);
   }

   const payload = (await response.json()) as EspnNewsResponse;

   return (payload.articles ?? [])
      .filter((article) => articleMatchesTeam(article, team))
      .filter((article) => articleLooksLikeRumor(article, team.sport))
      .map((article) => normalizeArticle(article, team.sport))
      .filter((article): article is RumorMillItem => article !== null)
      .slice(0, 5);
}
