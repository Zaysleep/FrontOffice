import type { TeamAdapterInput, TopReportItem } from "../types";

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

function getEspnNewsConfig(team: TeamAdapterInput): EspnNewsLeagueConfig {
   if (team.sport === "SOCCER" && team.league === "MLS") {
      return {
         sportPath: "soccer",
         leaguePath: "usa.1",
      };
   }

   return ESPN_NEWS_CONFIG[team.sport];
}

function normalizeArticle(article: EspnNewsArticle): TopReportItem | null {
   if (!article.headline || !article.description) {
      return null;
   }

   const articleId = article.id?.toString() ?? `${article.headline}-${article.published ?? article.lastModified ?? ""}`;

   return {
      id: articleId,
      headline: article.headline,
      summary: article.description,
      source: {
         name: "ESPN",
         url: article.links?.web?.href ?? article.links?.mobile?.href,
      },
      publishedAt: article.published ?? article.lastModified,
   };
}

function articleMatchesTeam(article: EspnNewsArticle, team: TeamAdapterInput) {
   const teamName = team.teamName.toLowerCase();
   const abbreviation = team.providerTeamKey?.toLowerCase() ?? "";

   const articleText = [article.headline, article.description].filter(Boolean).join(" ").toLowerCase();

   const categoryNames = (article.categories ?? []).map((category) => category.description?.toLowerCase()).filter((value): value is string => typeof value === "string");

   return articleText.includes(teamName) || categoryNames.includes(teamName) || (abbreviation.length >= 2 && categoryNames.includes(abbreviation));
}

export async function fetchEspnTopReport(team: TeamAdapterInput): Promise<TopReportItem[]> {
   const config = getEspnNewsConfig(team);

   const endpoint = `https://site.api.espn.com/apis/site/v2/sports/` + `${config.sportPath}/${config.leaguePath}/news?limit=50`;

   const response = await fetch(endpoint, {
      next: {
         revalidate: 1800,
      },
   });

   if (!response.ok) {
      throw new Error(`${team.league} news request failed with ${response.status}.`);
   }

   const payload = (await response.json()) as EspnNewsResponse;

   const articles = payload.articles ?? [];

   return articles
      .filter((article) => articleMatchesTeam(article, team))
      .map(normalizeArticle)
      .filter((article): article is TopReportItem => article !== null)
      .slice(0, 5);
}
