import type { TeamBrief } from "@/data/frontofficeData";
import type { TopReportItem } from "@/lib/sports/types";

type DecisionQuestionInput = {
   brief: TeamBrief;
   topReport?: TopReportItem;
};

type QuestionRule = {
   keywords: string[];
   question: (team: string) => string;
};

const UNIVERSAL_RULES: QuestionRule[] = [
   {
      keywords: ["trade", "traded", "deal", "acquire", "acquisition"],
      question: (team) => `Should ${team} make the move now, or protect its long-term assets?`,
   },
   {
      keywords: ["free agent", "free agency", "signing", "sign", "contract"],
      question: (team) => `Should ${team} spend aggressively now, or preserve flexibility for the next opportunity?`,
   },
   {
      keywords: ["draft", "prospect", "pick", "rookie"],
      question: (team) => `Should ${team} trust the young pipeline, or use those assets to win sooner?`,
   },
   {
      keywords: ["coach", "manager", "coaching", "staff"],
      question: (team) => `Is this a personnel problem for ${team}, or does the plan itself need to change?`,
   },
   {
      keywords: ["injury", "injured", "out", "questionable", "return"],
      question: (team) => `Should ${team} stay patient with the current group, or add insurance before availability becomes a bigger problem?`,
   },
];

const NBA_RULES: QuestionRule[] = [
   {
      keywords: ["summer league", "young core", "development"],
      question: () => "Which young player has done enough to earn a real rotation opportunity?",
   },
   {
      keywords: ["center", "rim protection", "rebounding", "frontcourt"],
      question: () => "Should the front office prioritize size and rim protection over shooting and versatility?",
   },
   {
      keywords: ["wing", "perimeter defense", "defense"],
      question: () => "Would you spend future assets on a two-way wing who can help right now?",
   },
];

const NFL_RULES: QuestionRule[] = [
   {
      keywords: ["quarterback", "qb"],
      question: () => "Should the front office keep building around the current quarterback plan, or prepare another path?",
   },
   {
      keywords: ["offensive line", "o-line", "protection"],
      question: () => "Should the next major investment go toward protection up front before another skill-position splash?",
   },
   {
      keywords: ["defense", "pass rush", "secondary"],
      question: () => "Should the team use its next major resource on defense, even if it limits flexibility elsewhere?",
   },
];

const MLB_RULES: QuestionRule[] = [
   {
      keywords: ["bullpen", "reliever", "closer"],
      question: () => "Would you move prospect capital for bullpen help before the deadline?",
   },
   {
      keywords: ["rotation", "starter", "starting pitching", "pitcher"],
      question: () => "Should the front office pay the price for another starter, or trust the current rotation?",
   },
   {
      keywords: ["deadline", "wild card", "playoff race"],
      question: () => "Is this roster close enough to justify an aggressive deadline move?",
   },
];

const SOCCER_RULES: QuestionRule[] = [
   {
      keywords: ["transfer", "signing", "window"],
      question: () => "Should the club chase one major signing, or spread the budget across multiple needs?",
   },
   {
      keywords: ["midfield", "midfielder"],
      question: () => "Should the next move strengthen midfield control, or add more direct attacking quality?",
   },
   {
      keywords: ["striker", "forward", "goal scoring", "goals"],
      question: () => "Should the club spend heavily on a proven scorer, or trust the current attack to improve?",
   },
   {
      keywords: ["defender", "defence", "defense", "back line", "centre-back", "center back"],
      question: () => "Should the next major investment go into the back line before adding another attacking piece?",
   },
];

function getSportRules(sport: string) {
   switch (sport) {
      case "NBA":
         return NBA_RULES;
      case "NFL":
         return NFL_RULES;
      case "MLB":
         return MLB_RULES;
      case "SOCCER":
         return SOCCER_RULES;
      default:
         return [];
   }
}

function findMatchingQuestion(rules: QuestionRule[], text: string, team: string) {
   const rule = rules.find((item) => item.keywords.some((keyword) => text.includes(keyword)));

   return rule?.question(team);
}

export function buildQuestionBeforeOffice({ brief, topReport }: DecisionQuestionInput) {
   if (!topReport) {
      return brief.decisionPrompt;
   }

   const reportText = `${topReport.headline} ${topReport.summary}`.toLowerCase();

   const sportQuestion = findMatchingQuestion(getSportRules(brief.sport), reportText, brief.team);

   if (sportQuestion) {
      return sportQuestion;
   }

   const universalQuestion = findMatchingQuestion(UNIVERSAL_RULES, reportText, brief.team);

   if (universalQuestion) {
      return universalQuestion;
   }

   return brief.decisionPrompt;
}
