import { mlsTeams } from "@/data/mlsTeams";

/**
 * FrontOffice shared types and data foundation
 *
 * MK II direction:
 * - Prep the app for online user use
 * - Keep the app lean and avoid bloatware
 * - Support all teams from the four selected sports
 * - Keep current UI working while making the data layer more scalable
 *
 * Current sports:
 * - NBA
 * - Football, currently NFL
 * - Soccer, currently Premier League and MLS
 * - Baseball, currently MLB
 *
 * Future use:
 * - Replace generated fallback reports with API-supported reports
 * - Replace mock War Room posts with database-backed posts
 * - Replace receipts with user profile activity from the database
 * - Add live sports/news adapters without rewriting the UI
 */

export type Sport = "NBA" | "Football" | "Soccer" | "Baseball";

export type League = "NBA" | "NFL" | "Premier League" | "MLS" | "MLB";

export type Team = {
   id: string;
   sport: Sport;
   league: League;
   team: string;
   city?: string;
   abbreviation?: string;
};

export type TeamBrief = {
   sport: Sport;
   team: string;
   storyline: string;
   fanPressure: string;
   teamNeeds: string[];
   statsThatMatter: string[];
   decisionPrompt: string;
   capStatus: string;
};

export type FrontOfficeUser = {
   name: string;
   handle: string;
   initials: string;
   bio: string;
   profileImageUrl?: string;
   bannerImageUrl?: string;
   favoriteTeams: string[];
   isCurrentUser?: boolean;
};

export type FrontOfficeProfile = FrontOfficeUser;

export type PostAuthor = {
   name: string;
   handle: string;
   initials: string;
   isCurrentUser?: boolean;
};

export type WarRoomPost = {
   id: number;
   user: string;
   team: string;
   take: string;
   votes: number;
   comments: number;
   tag: string;
   createdAt: string;

   /**
    * MK II-ready field.
    * Existing UI can still use `user`, but future feed/profile logic
    * should use `author`.
    */
   author?: PostAuthor;
};

/**
 * WarRoomComment
 *
 * Comment model for War Room discussions.
 *
 * Current use:
 * - Attach comments to a post
 * - Show comment author identity
 * - Support current-user ownership
 * - Support comment deletion later
 *
 * Future use:
 * - Database persistence
 * - Replies
 * - Likes
 * - Moderation
 */
export type WarRoomComment = {
   id: number;
   postId: number;
   author: PostAuthor;
   body: string;
   createdAt: string;

   /**
    * Optional foundation for future nested replies.
    * Leave undefined for a top-level comment.
    */
   parentCommentId?: number;
};

export type Receipt = {
   id: number;
   type: string;
   team: string;
   call: string;
   confidence: string;

   /**
    * MK II Build 3A
    *
    * Receipts use one shared six-stage lifecycle across
    * Profile, War Room, Supabase, and future resurfacing logic.
    */
   status: "Open" | "Looking Good" | "On the Ropes" | "Cold Take" | "Called It" | "Legendary";

   reaction: string;
   createdAt: string;
};

export type CallFormState = {
   callType: string;
   confidence: string;
   call: string;
   reason: string;
};

export type NewsCategory = "Injury" | "Trade" | "Roster" | "Cap" | "Performance" | "Deadline" | "Transfer" | "Draft" | "Free Agency";

export type TeamUpdate = {
   id: string;
   team: string;
   sport: Sport;
   league: League;
   title: string;
   summary: string;
   source: string;
   category: NewsCategory;
   publishedAt: string;
};

/**
 * Central social user directory.
 *
 * All profile-facing UI should read Maya, Dre, and future users from here
 * instead of redefining them inside individual components.
 *
 * The current user's editable profile still lives in app state and LocalStorage,
 * then overrides the starter record at runtime.
 */
export const frontOfficeUsers: FrontOfficeUser[] = [
   {
      name: "Isaiah Brown",
      handle: "@ibrown92105",
      initials: "IB",
      bio: "Making front office calls, keeping receipts, and letting the War Room judge the tape.",
      favoriteTeams: ["Los Angeles Lakers", "San Diego Padres", "Manchester United"],
      isCurrentUser: true,
   },
   {
      name: "Maya Chen",
      handle: "@mayatalkssports",
      initials: "MC",
      bio: "Deadline watcher. Baseball and NBA takes with no patience for panic moves.",
      favoriteTeams: ["San Diego Padres", "Los Angeles Lakers"],
   },
   {
      name: "Dre Carter",
      handle: "@dregm",
      initials: "DC",
      bio: "Soccer tactics, transfer window opinions, and strong feelings about squad balance.",
      favoriteTeams: ["Manchester United"],
   },
];

export const frontOfficeUsersByHandle: Record<string, FrontOfficeUser> = Object.fromEntries(frontOfficeUsers.map((user) => [user.handle, user]));

export const followerHandlesByProfile: Record<string, string[]> = {
   "@ibrown92105": ["@mayatalkssports", "@dregm"],
   "@mayatalkssports": ["@ibrown92105", "@dregm"],
   "@dregm": ["@ibrown92105", "@mayatalkssports"],
};

export const followingHandlesByProfile: Record<string, string[]> = {
   "@mayatalkssports": ["@dregm", "@ibrown92105"],
   "@dregm": ["@mayatalkssports"],
};

/**
 * Full team foundation.
 * This gives the managing menu real coverage without requiring live APIs yet.
 */

export const allTeams: Team[] = [
   // NBA
   { id: "nba-atl", sport: "NBA", league: "NBA", team: "Atlanta Hawks", city: "Atlanta", abbreviation: "ATL" },
   { id: "nba-bos", sport: "NBA", league: "NBA", team: "Boston Celtics", city: "Boston", abbreviation: "BOS" },
   { id: "nba-bkn", sport: "NBA", league: "NBA", team: "Brooklyn Nets", city: "Brooklyn", abbreviation: "BKN" },
   { id: "nba-cha", sport: "NBA", league: "NBA", team: "Charlotte Hornets", city: "Charlotte", abbreviation: "CHA" },
   { id: "nba-chi", sport: "NBA", league: "NBA", team: "Chicago Bulls", city: "Chicago", abbreviation: "CHI" },
   { id: "nba-cle", sport: "NBA", league: "NBA", team: "Cleveland Cavaliers", city: "Cleveland", abbreviation: "CLE" },
   { id: "nba-dal", sport: "NBA", league: "NBA", team: "Dallas Mavericks", city: "Dallas", abbreviation: "DAL" },
   { id: "nba-den", sport: "NBA", league: "NBA", team: "Denver Nuggets", city: "Denver", abbreviation: "DEN" },
   { id: "nba-det", sport: "NBA", league: "NBA", team: "Detroit Pistons", city: "Detroit", abbreviation: "DET" },
   { id: "nba-gsw", sport: "NBA", league: "NBA", team: "Golden State Warriors", city: "Golden State", abbreviation: "GSW" },
   { id: "nba-hou", sport: "NBA", league: "NBA", team: "Houston Rockets", city: "Houston", abbreviation: "HOU" },
   { id: "nba-ind", sport: "NBA", league: "NBA", team: "Indiana Pacers", city: "Indiana", abbreviation: "IND" },
   { id: "nba-lac", sport: "NBA", league: "NBA", team: "LA Clippers", city: "Los Angeles", abbreviation: "LAC" },
   { id: "nba-lal", sport: "NBA", league: "NBA", team: "Los Angeles Lakers", city: "Los Angeles", abbreviation: "LAL" },
   { id: "nba-mem", sport: "NBA", league: "NBA", team: "Memphis Grizzlies", city: "Memphis", abbreviation: "MEM" },
   { id: "nba-mia", sport: "NBA", league: "NBA", team: "Miami Heat", city: "Miami", abbreviation: "MIA" },
   { id: "nba-mil", sport: "NBA", league: "NBA", team: "Milwaukee Bucks", city: "Milwaukee", abbreviation: "MIL" },
   { id: "nba-min", sport: "NBA", league: "NBA", team: "Minnesota Timberwolves", city: "Minnesota", abbreviation: "MIN" },
   { id: "nba-nop", sport: "NBA", league: "NBA", team: "New Orleans Pelicans", city: "New Orleans", abbreviation: "NOP" },
   { id: "nba-nyk", sport: "NBA", league: "NBA", team: "New York Knicks", city: "New York", abbreviation: "NYK" },
   { id: "nba-okc", sport: "NBA", league: "NBA", team: "Oklahoma City Thunder", city: "Oklahoma City", abbreviation: "OKC" },
   { id: "nba-orl", sport: "NBA", league: "NBA", team: "Orlando Magic", city: "Orlando", abbreviation: "ORL" },
   { id: "nba-phi", sport: "NBA", league: "NBA", team: "Philadelphia 76ers", city: "Philadelphia", abbreviation: "PHI" },
   { id: "nba-phx", sport: "NBA", league: "NBA", team: "Phoenix Suns", city: "Phoenix", abbreviation: "PHX" },
   { id: "nba-por", sport: "NBA", league: "NBA", team: "Portland Trail Blazers", city: "Portland", abbreviation: "POR" },
   { id: "nba-sac", sport: "NBA", league: "NBA", team: "Sacramento Kings", city: "Sacramento", abbreviation: "SAC" },
   { id: "nba-sas", sport: "NBA", league: "NBA", team: "San Antonio Spurs", city: "San Antonio", abbreviation: "SAS" },
   { id: "nba-tor", sport: "NBA", league: "NBA", team: "Toronto Raptors", city: "Toronto", abbreviation: "TOR" },
   { id: "nba-uta", sport: "NBA", league: "NBA", team: "Utah Jazz", city: "Utah", abbreviation: "UTA" },
   { id: "nba-was", sport: "NBA", league: "NBA", team: "Washington Wizards", city: "Washington", abbreviation: "WAS" },

   // NFL
   { id: "nfl-ari", sport: "Football", league: "NFL", team: "Arizona Cardinals", city: "Arizona", abbreviation: "ARI" },
   { id: "nfl-atl", sport: "Football", league: "NFL", team: "Atlanta Falcons", city: "Atlanta", abbreviation: "ATL" },
   { id: "nfl-bal", sport: "Football", league: "NFL", team: "Baltimore Ravens", city: "Baltimore", abbreviation: "BAL" },
   { id: "nfl-buf", sport: "Football", league: "NFL", team: "Buffalo Bills", city: "Buffalo", abbreviation: "BUF" },
   { id: "nfl-car", sport: "Football", league: "NFL", team: "Carolina Panthers", city: "Carolina", abbreviation: "CAR" },
   { id: "nfl-chi", sport: "Football", league: "NFL", team: "Chicago Bears", city: "Chicago", abbreviation: "CHI" },
   { id: "nfl-cin", sport: "Football", league: "NFL", team: "Cincinnati Bengals", city: "Cincinnati", abbreviation: "CIN" },
   { id: "nfl-cle", sport: "Football", league: "NFL", team: "Cleveland Browns", city: "Cleveland", abbreviation: "CLE" },
   { id: "nfl-dal", sport: "Football", league: "NFL", team: "Dallas Cowboys", city: "Dallas", abbreviation: "DAL" },
   { id: "nfl-den", sport: "Football", league: "NFL", team: "Denver Broncos", city: "Denver", abbreviation: "DEN" },
   { id: "nfl-det", sport: "Football", league: "NFL", team: "Detroit Lions", city: "Detroit", abbreviation: "DET" },
   { id: "nfl-gb", sport: "Football", league: "NFL", team: "Green Bay Packers", city: "Green Bay", abbreviation: "GB" },
   { id: "nfl-hou", sport: "Football", league: "NFL", team: "Houston Texans", city: "Houston", abbreviation: "HOU" },
   { id: "nfl-ind", sport: "Football", league: "NFL", team: "Indianapolis Colts", city: "Indianapolis", abbreviation: "IND" },
   { id: "nfl-jax", sport: "Football", league: "NFL", team: "Jacksonville Jaguars", city: "Jacksonville", abbreviation: "JAX" },
   { id: "nfl-kc", sport: "Football", league: "NFL", team: "Kansas City Chiefs", city: "Kansas City", abbreviation: "KC" },
   { id: "nfl-lv", sport: "Football", league: "NFL", team: "Las Vegas Raiders", city: "Las Vegas", abbreviation: "LV" },
   { id: "nfl-lac", sport: "Football", league: "NFL", team: "Los Angeles Chargers", city: "Los Angeles", abbreviation: "LAC" },
   { id: "nfl-lar", sport: "Football", league: "NFL", team: "Los Angeles Rams", city: "Los Angeles", abbreviation: "LAR" },
   { id: "nfl-mia", sport: "Football", league: "NFL", team: "Miami Dolphins", city: "Miami", abbreviation: "MIA" },
   { id: "nfl-min", sport: "Football", league: "NFL", team: "Minnesota Vikings", city: "Minnesota", abbreviation: "MIN" },
   { id: "nfl-ne", sport: "Football", league: "NFL", team: "New England Patriots", city: "New England", abbreviation: "NE" },
   { id: "nfl-no", sport: "Football", league: "NFL", team: "New Orleans Saints", city: "New Orleans", abbreviation: "NO" },
   { id: "nfl-nyg", sport: "Football", league: "NFL", team: "New York Giants", city: "New York", abbreviation: "NYG" },
   { id: "nfl-nyj", sport: "Football", league: "NFL", team: "New York Jets", city: "New York", abbreviation: "NYJ" },
   { id: "nfl-phi", sport: "Football", league: "NFL", team: "Philadelphia Eagles", city: "Philadelphia", abbreviation: "PHI" },
   { id: "nfl-pit", sport: "Football", league: "NFL", team: "Pittsburgh Steelers", city: "Pittsburgh", abbreviation: "PIT" },
   { id: "nfl-sf", sport: "Football", league: "NFL", team: "San Francisco 49ers", city: "San Francisco", abbreviation: "SF" },
   { id: "nfl-sea", sport: "Football", league: "NFL", team: "Seattle Seahawks", city: "Seattle", abbreviation: "SEA" },
   { id: "nfl-tb", sport: "Football", league: "NFL", team: "Tampa Bay Buccaneers", city: "Tampa Bay", abbreviation: "TB" },
   { id: "nfl-ten", sport: "Football", league: "NFL", team: "Tennessee Titans", city: "Tennessee", abbreviation: "TEN" },
   { id: "nfl-was", sport: "Football", league: "NFL", team: "Washington Commanders", city: "Washington", abbreviation: "WAS" },

   // Premier League
   { id: "epl-ars", sport: "Soccer", league: "Premier League", team: "Arsenal", city: "London", abbreviation: "ARS" },
   { id: "epl-avl", sport: "Soccer", league: "Premier League", team: "Aston Villa", city: "Birmingham", abbreviation: "AVL" },
   { id: "epl-bou", sport: "Soccer", league: "Premier League", team: "Bournemouth", city: "Bournemouth", abbreviation: "BOU" },
   { id: "epl-bre", sport: "Soccer", league: "Premier League", team: "Brentford", city: "London", abbreviation: "BRE" },
   { id: "epl-bha", sport: "Soccer", league: "Premier League", team: "Brighton & Hove Albion", city: "Brighton", abbreviation: "BHA" },
   { id: "epl-che", sport: "Soccer", league: "Premier League", team: "Chelsea", city: "London", abbreviation: "CHE" },
   { id: "epl-cry", sport: "Soccer", league: "Premier League", team: "Crystal Palace", city: "London", abbreviation: "CRY" },
   { id: "epl-eve", sport: "Soccer", league: "Premier League", team: "Everton", city: "Liverpool", abbreviation: "EVE" },
   { id: "epl-ful", sport: "Soccer", league: "Premier League", team: "Fulham", city: "London", abbreviation: "FUL" },
   { id: "epl-liv", sport: "Soccer", league: "Premier League", team: "Liverpool", city: "Liverpool", abbreviation: "LIV" },
   { id: "epl-mci", sport: "Soccer", league: "Premier League", team: "Manchester City", city: "Manchester", abbreviation: "MCI" },
   { id: "epl-mun", sport: "Soccer", league: "Premier League", team: "Manchester United", city: "Manchester", abbreviation: "MUN" },
   { id: "epl-new", sport: "Soccer", league: "Premier League", team: "Newcastle United", city: "Newcastle", abbreviation: "NEW" },
   { id: "epl-nfo", sport: "Soccer", league: "Premier League", team: "Nottingham Forest", city: "Nottingham", abbreviation: "NFO" },
   { id: "epl-sun", sport: "Soccer", league: "Premier League", team: "Sunderland", city: "Sunderland", abbreviation: "SUN" },
   { id: "epl-tot", sport: "Soccer", league: "Premier League", team: "Tottenham Hotspur", city: "London", abbreviation: "TOT" },
   { id: "epl-whu", sport: "Soccer", league: "Premier League", team: "West Ham United", city: "London", abbreviation: "WHU" },
   { id: "epl-wol", sport: "Soccer", league: "Premier League", team: "Wolverhampton Wanderers", city: "Wolverhampton", abbreviation: "WOL" },
   { id: "epl-lee", sport: "Soccer", league: "Premier League", team: "Leeds United", city: "Leeds", abbreviation: "LEE" },
   { id: "epl-bur", sport: "Soccer", league: "Premier League", team: "Burnley", city: "Burnley", abbreviation: "BUR" },

   // MLB
   { id: "mlb-ari", sport: "Baseball", league: "MLB", team: "Arizona Diamondbacks", city: "Arizona", abbreviation: "ARI" },
   { id: "mlb-atl", sport: "Baseball", league: "MLB", team: "Atlanta Braves", city: "Atlanta", abbreviation: "ATL" },
   { id: "mlb-bal", sport: "Baseball", league: "MLB", team: "Baltimore Orioles", city: "Baltimore", abbreviation: "BAL" },
   { id: "mlb-bos", sport: "Baseball", league: "MLB", team: "Boston Red Sox", city: "Boston", abbreviation: "BOS" },
   { id: "mlb-chc", sport: "Baseball", league: "MLB", team: "Chicago Cubs", city: "Chicago", abbreviation: "CHC" },
   { id: "mlb-cws", sport: "Baseball", league: "MLB", team: "Chicago White Sox", city: "Chicago", abbreviation: "CWS" },
   { id: "mlb-cin", sport: "Baseball", league: "MLB", team: "Cincinnati Reds", city: "Cincinnati", abbreviation: "CIN" },
   { id: "mlb-cle", sport: "Baseball", league: "MLB", team: "Cleveland Guardians", city: "Cleveland", abbreviation: "CLE" },
   { id: "mlb-col", sport: "Baseball", league: "MLB", team: "Colorado Rockies", city: "Colorado", abbreviation: "COL" },
   { id: "mlb-det", sport: "Baseball", league: "MLB", team: "Detroit Tigers", city: "Detroit", abbreviation: "DET" },
   { id: "mlb-hou", sport: "Baseball", league: "MLB", team: "Houston Astros", city: "Houston", abbreviation: "HOU" },
   { id: "mlb-kc", sport: "Baseball", league: "MLB", team: "Kansas City Royals", city: "Kansas City", abbreviation: "KC" },
   { id: "mlb-laa", sport: "Baseball", league: "MLB", team: "Los Angeles Angels", city: "Los Angeles", abbreviation: "LAA" },
   { id: "mlb-lad", sport: "Baseball", league: "MLB", team: "Los Angeles Dodgers", city: "Los Angeles", abbreviation: "LAD" },
   { id: "mlb-mia", sport: "Baseball", league: "MLB", team: "Miami Marlins", city: "Miami", abbreviation: "MIA" },
   { id: "mlb-mil", sport: "Baseball", league: "MLB", team: "Milwaukee Brewers", city: "Milwaukee", abbreviation: "MIL" },
   { id: "mlb-min", sport: "Baseball", league: "MLB", team: "Minnesota Twins", city: "Minnesota", abbreviation: "MIN" },
   { id: "mlb-nym", sport: "Baseball", league: "MLB", team: "New York Mets", city: "New York", abbreviation: "NYM" },
   { id: "mlb-nyy", sport: "Baseball", league: "MLB", team: "New York Yankees", city: "New York", abbreviation: "NYY" },
   { id: "mlb-ath", sport: "Baseball", league: "MLB", team: "Athletics", city: "Athletics", abbreviation: "ATH" },
   { id: "mlb-phi", sport: "Baseball", league: "MLB", team: "Philadelphia Phillies", city: "Philadelphia", abbreviation: "PHI" },
   { id: "mlb-pit", sport: "Baseball", league: "MLB", team: "Pittsburgh Pirates", city: "Pittsburgh", abbreviation: "PIT" },
   { id: "mlb-sd", sport: "Baseball", league: "MLB", team: "San Diego Padres", city: "San Diego", abbreviation: "SD" },
   { id: "mlb-sf", sport: "Baseball", league: "MLB", team: "San Francisco Giants", city: "San Francisco", abbreviation: "SF" },
   { id: "mlb-sea", sport: "Baseball", league: "MLB", team: "Seattle Mariners", city: "Seattle", abbreviation: "SEA" },
   { id: "mlb-stl", sport: "Baseball", league: "MLB", team: "St. Louis Cardinals", city: "St. Louis", abbreviation: "STL" },
   { id: "mlb-tb", sport: "Baseball", league: "MLB", team: "Tampa Bay Rays", city: "Tampa Bay", abbreviation: "TB" },
   { id: "mlb-tex", sport: "Baseball", league: "MLB", team: "Texas Rangers", city: "Texas", abbreviation: "TEX" },
   { id: "mlb-tor", sport: "Baseball", league: "MLB", team: "Toronto Blue Jays", city: "Toronto", abbreviation: "TOR" },
   { id: "mlb-was", sport: "Baseball", league: "MLB", team: "Washington Nationals", city: "Washington", abbreviation: "WAS" },

   // MLS
   ...mlsTeams,
];

/**
 * Custom reports for featured teams.
 * These keep your original stronger examples while the rest of the teams
 * receive generated fallback reports.
 */
const featuredTeamBriefs: TeamBrief[] = [
   {
      sport: "NBA",
      team: "Los Angeles Lakers",
      storyline: "The roster is stuck between win-now pressure and future flexibility. The fan base wants help, but the cap sheet is already sweating.",
      fanPressure: "Win-Now Pressure",
      teamNeeds: ["Perimeter defense", "Bench scoring", "Reliable shooting"],
      statsThatMatter: ["Bottom 10 in bench scoring", "Needs stronger point-of-attack defense", "Limited trade flexibility"],
      decisionPrompt: "Would you trade future picks for a defensive wing who helps right now?",
      capStatus: "Luxury Tax Pressure",
   },
   {
      sport: "Football",
      team: "Los Angeles Chargers",
      storyline: "The team has talent, but the front office needs to protect the quarterback and build a more balanced roster.",
      fanPressure: "Retool Watch",
      teamNeeds: ["Offensive line depth", "Run game consistency", "Secondary help"],
      statsThatMatter: ["Pressure rate remains too high", "Run game needs more stability", "Depth questions after injuries"],
      decisionPrompt: "Should the team spend big in free agency or build through the draft?",
      capStatus: "Tight Fit",
   },
   {
      sport: "Soccer",
      team: "Manchester United",
      storyline: "The squad has star power, but fans are debating whether the club needs a tactical reset or another transfer window splash.",
      fanPressure: "Fan Pressure Rising",
      teamNeeds: ["Midfield control", "Consistent striker play", "Defensive structure"],
      statsThatMatter: ["Chance creation is inconsistent", "Wage bill remains heavy", "Supporters want a clear identity"],
      decisionPrompt: "Would you sell a popular player to fund a better-balanced squad?",
      capStatus: "Wage Bill Pressure",
   },
   {
      sport: "Baseball",
      team: "San Diego Padres",
      storyline: "The roster has enough talent to compete, but the front office has to decide whether to chase now or protect the farm.",
      fanPressure: "Deadline Watch",
      teamNeeds: ["Bullpen help", "Starting pitching depth", "More consistent bats"],
      statsThatMatter: ["Late-game pitching has been unstable", "Lineup production comes in waves", "Trade deadline decisions are looming"],
      decisionPrompt: "Would you move prospects for bullpen help before the deadline?",
      capStatus: "Payroll Watch",
   },
];

/**
 * teamBriefs remains the main export used by the current UI.
 * It now includes every team from allTeams.
 */
export const teamBriefs: TeamBrief[] = allTeams.map((team) => {
   const featuredBrief = featuredTeamBriefs.find((brief) => brief.sport === team.sport && brief.team === team.team);

   return featuredBrief ?? createFallbackTeamBrief(team);
});

/**
 * Early update structure for future real news/API integration.
 * These can later be replaced by ESPN/API-Sports/TheSportsDB/etc.
 */
export const mockTeamUpdates: TeamUpdate[] = [
   {
      id: "update-lal-1",
      team: "Los Angeles Lakers",
      sport: "NBA",
      league: "NBA",
      title: "Lakers weighing defensive help before making an aggressive move",
      summary: "The front office conversation is centered on whether the roster needs a defensive wing more than another scorer.",
      source: "FrontOffice Mock Wire",
      category: "Trade",
      publishedAt: "2026-07-03T12:00:00Z",
   },
   {
      id: "update-lac-1",
      team: "Los Angeles Chargers",
      sport: "Football",
      league: "NFL",
      title: "Chargers evaluating protection and depth before roster decisions",
      summary: "Offensive line depth and a more consistent run game remain major talking points around the team.",
      source: "FrontOffice Mock Wire",
      category: "Roster",
      publishedAt: "2026-07-03T12:10:00Z",
   },
   {
      id: "update-mun-1",
      team: "Manchester United",
      sport: "Soccer",
      league: "Premier League",
      title: "United pressure builds around midfield balance and wage structure",
      summary: "Supporters are debating whether the club needs another star signing or a cleaner tactical identity.",
      source: "FrontOffice Mock Wire",
      category: "Transfer",
      publishedAt: "2026-07-03T12:20:00Z",
   },
   {
      id: "update-sd-1",
      team: "San Diego Padres",
      sport: "Baseball",
      league: "MLB",
      title: "Padres bullpen remains a deadline talking point",
      summary: "Late-game pitching has become one of the biggest issues shaping front office pressure.",
      source: "FrontOffice Mock Wire",
      category: "Deadline",
      publishedAt: "2026-07-03T12:30:00Z",
   },
];

export const initialWarRoomPosts: WarRoomPost[] = [
   {
      id: 1,
      user: "Isaiah",
      author: {
         name: "Isaiah Brown",
         handle: "@ibrown92105",
         initials: "IB",
         isCurrentUser: true,
      },
      team: "Lakers",
      take: "Do not trade both first-round picks unless the move fixes the defense. A scorer alone is not enough.",
      votes: 142,
      comments: 3,
      tag: "Ball Knowledge",
      createdAt: "2026-07-04T12:40:00Z",
   },
   {
      id: 2,
      user: "Maya",
      author: {
         name: "Maya Chen",
         handle: "@mayatalkssports",
         initials: "MC",
      },
      team: "Padres",
      take: "If the bullpen blows another late lead, the front office has to buy before the deadline.",
      votes: 87,
      comments: 2,
      tag: "Screenshot This",
      createdAt: "2026-07-04T11:55:00Z",
   },
   {
      id: 3,
      user: "Dre",
      author: {
         name: "Dre Carter",
         handle: "@dregm",
         initials: "DC",
      },
      team: "Manchester United",
      take: "The club does not need another headline signing. It needs a real midfield structure.",
      votes: 64,
      comments: 3,
      tag: "Let Him Cook",
      createdAt: "2026-07-04T10:50:00Z",
   },
];

/**
 * Initial War Room discussion data.
 *
 * These comments are tied to the starter War Room posts above.
 *
 * Later:
 * - Fetch comments from the database by post id
 * - Add pagination for large discussions
 * - Add reply threads
 * - Add comment reactions
 * - Add moderation/report actions
 */
export const initialWarRoomComments: WarRoomComment[] = [
   {
      id: 101,
      postId: 1,
      author: {
         name: "Maya Chen",
         handle: "@mayatalkssports",
         initials: "MC",
      },
      body: "I agree on the defense, but the player has to be able to stay on the floor offensively too. You cannot give up both picks for a specialist.",
      createdAt: "2026-07-04T09:15:00Z",
   },
   {
      id: 102,
      postId: 1,
      author: {
         name: "Dre Carter",
         handle: "@dregm",
         initials: "DC",
      },
      body: "Exactly. The price matters as much as the player. A good move at a bad price can still hurt the team.",
      createdAt: "2026-07-04T09:22:00Z",
   },
   {
      id: 103,
      postId: 1,
      author: {
         name: "Isaiah Brown",
         handle: "@ibrown92105",
         initials: "IB",
         isCurrentUser: true,
      },
      body: "That is where I am too. I would move one pick for the right two-way player, but both picks should require a major upgrade.",
      createdAt: "2026-07-04T09:31:00Z",
   },
   {
      id: 201,
      postId: 2,
      author: {
         name: "Dre Carter",
         handle: "@dregm",
         initials: "DC",
      },
      body: "The bullpen is the obvious weakness, but I still would not empty the farm system for a rental.",
      createdAt: "2026-07-04T10:05:00Z",
   },
   {
      id: 202,
      postId: 2,
      author: {
         name: "Maya Chen",
         handle: "@mayatalkssports",
         initials: "MC",
      },
      body: "Agreed. Buy, but buy intelligently. One reliable late-inning arm could change how the whole staff gets used.",
      createdAt: "2026-07-04T10:12:00Z",
   },
   {
      id: 301,
      postId: 3,
      author: {
         name: "Maya Chen",
         handle: "@mayatalkssports",
         initials: "MC",
      },
      body: "The squad keeps collecting talent without fixing the same structural problems. Midfield balance has to come first.",
      createdAt: "2026-07-04T11:02:00Z",
   },
   {
      id: 302,
      postId: 3,
      author: {
         name: "Isaiah Brown",
         handle: "@ibrown92105",
         initials: "IB",
         isCurrentUser: true,
      },
      body: "That is my issue with another star signing too. A big name does not automatically make the team more balanced.",
      createdAt: "2026-07-04T11:10:00Z",
   },
   {
      id: 303,
      postId: 3,
      author: {
         name: "Dre Carter",
         handle: "@dregm",
         initials: "DC",
      },
      body: "Build the midfield first and the attackers probably look better anyway.",
      createdAt: "2026-07-04T11:18:00Z",
   },
];

export const initialReceipts: Receipt[] = [
   {
      id: 1,
      type: "Trade Take",
      team: "Los Angeles Lakers",
      call: "Trade for a defensive wing before chasing another ball-dominant scorer.",
      confidence: "Just Spitballing",
      status: "Open",
      reaction: "Ball Knowledge",
      createdAt: "2026-07-05T18:00:00.000Z",
   },
   {
      id: 2,
      type: "Deadline Take",
      team: "San Diego Padres",
      call: "Add bullpen help before the deadline or risk wasting the lineup.",
      confidence: "Just Spitballing",
      status: "Open",
      reaction: "Screenshot This",
      createdAt: "2026-07-04T18:00:00.000Z",
   },
   {
      id: 3,
      type: "Transfer Take",
      team: "Manchester United",
      call: "Fix the midfield balance before buying another luxury attacker.",
      confidence: "Just Spitballing",
      status: "Looking Good",
      reaction: "Front Office Material",
      createdAt: "2026-07-03T18:00:00.000Z",
   },
];

/**
 * Initial Make the Call form state.
 * This keeps the form controlled and makes it easy to reset after posting.
 */
export const initialCallForm: CallFormState = {
   callType: "Trade Idea",
   confidence: "Just Spitballing",
   call: "",
   reason: "",
};

function createFallbackTeamBrief(team: Team): TeamBrief {
   const sportLanguage = getSportLanguage(team.sport);

   return {
      sport: team.sport,
      team: team.team,
      storyline: `${team.team} enters the office report with ${sportLanguage.storyline}. The conversation is centered on whether the front office should stay patient, make a measured move, or act before the market shifts.`,
      fanPressure: sportLanguage.fanPressure,
      teamNeeds: sportLanguage.teamNeeds,
      statsThatMatter: sportLanguage.statsThatMatter,
      decisionPrompt: sportLanguage.decisionPrompt,
      capStatus: sportLanguage.capStatus,
   };
}

function getSportLanguage(sport: Sport) {
   if (sport === "NBA") {
      return {
         storyline: "roster questions, cap pressure, and a fan base watching every move",
         fanPressure: "Roster Watch",
         teamNeeds: ["Two-way depth", "Reliable shooting", "Defensive consistency"],
         statsThatMatter: ["Rotation balance needs attention", "Shot creation and defensive fit matter", "Future flexibility should stay protected"],
         decisionPrompt: "Would you make a win-now move or protect future flexibility?",
         capStatus: "Cap Sheet Watch",
      };
   }

   if (sport === "Football") {
      return {
         storyline: "depth decisions, protection concerns, and pressure to build a more complete roster",
         fanPressure: "Roster Build Watch",
         teamNeeds: ["Line depth", "Defensive reliability", "Playmaker support"],
         statsThatMatter: ["Depth can decide the season", "Explosive plays change the front office conversation", "Draft capital and free agency money need balance"],
         decisionPrompt: "Would you spend in free agency or build through the draft?",
         capStatus: "Cap Space Watch",
      };
   }

   if (sport === "Soccer") {
      return {
         storyline: "transfer pressure, wage structure, and supporters asking for a clear identity",
         fanPressure: "Supporter Pressure",
         teamNeeds: ["Squad balance", "Midfield control", "Defensive structure"],
         statsThatMatter: ["Chance creation needs consistency", "Wage structure shapes transfer flexibility", "Squad balance matters more than headline names"],
         decisionPrompt: "Would you chase a star signing or fix the squad balance first?",
         capStatus: "Wage Bill Watch",
      };
   }

   return {
      storyline: "deadline questions, payroll pressure, and a roster that needs timely answers",
      fanPressure: "Deadline Watch",
      teamNeeds: ["Pitching depth", "Lineup consistency", "Late-game stability"],
      statsThatMatter: ["Bullpen performance can swing the season", "Lineup production needs consistency", "Prospect cost matters before the deadline"],
      decisionPrompt: "Would you move prospects for immediate help or protect the farm?",
      capStatus: "Payroll Watch",
   };
}
