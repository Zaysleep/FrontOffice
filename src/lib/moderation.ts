/**
 * FrontOffice moderation policy.
 *
 * Ordinary profanity and sports trash talk are allowed.
 * Identity-based slurs, dehumanizing hate, extermination language,
 * and targeted protected-class attacks are blocked.
 */

export type ModerationResult = {
   allowed: boolean;
   reason?: "blocked_term" | "hate_pattern";
   message?: string;
};

export const FRONT_OFFICE_MODERATION_MESSAGE = "That wording isn’t allowed on FrontOffice. Rewrite it and try again.";

const BLOCKED_TERMS = [
   // Anti-Black
   "nigger",
   "nigga",
   "coon",
   "jigaboo",
   "pickaninny",
   "sambo",
   "darkie",
   "porch monkey",
   "moon cricket",
   "tar baby",

   // Anti-Asian / East and Southeast Asian
   "chink",
   "gook",
   "zipperhead",
   "slant eye",
   "ching chong",

   // Antisemitic
   "kike",
   "heeb",
   "hymie",

   // Anti-Latino / Hispanic
   "spic",
   "wetback",
   "beaner",
   "greaser",

   // Anti-Arab / Middle Eastern / Muslim
   "sandnigger",
   "sand nigger",
   "raghead",
   "towelhead",
   "camel jockey",
   "dune coon",

   // Anti-South Asian
   "paki",

   // Anti-Indigenous
   "prairie nigger",
   "redskin",
   "wagon burner",

   // Anti-Romani
   "gyppo",

   // Anti-LGBTQ+
   "faggot",
   "fag",
   "dyke",
   "tranny",
   "shemale",

   // Disability-related
   "retard",
   "mongoloid",
] as const;

const PROTECTED_CLASS_TERMS = "(black|white|asian|latino|hispanic|arab|middle eastern|indian|pakistani|jewish|jew|muslim|christian|gay|lesbian|bisexual|trans|transgender|disabled|immigrant|indigenous|native american)";

const HATE_PATTERNS = [
   new RegExp(`\\b(all|those|these)\\s+${PROTECTED_CLASS_TERMS}\\s+(people\\s+)?(are\\s+)?(animals|vermin|filth|disease|subhuman|inferior|savages)\\b`, "i"),
   new RegExp(`\\b(kill|exterminate|eradicate|eliminate|remove|deport|wipe out)\\s+(all\\s+)?${PROTECTED_CLASS_TERMS}(\\s+people)?\\b`, "i"),
   new RegExp(`\\b${PROTECTED_CLASS_TERMS}\\s+(people\\s+)?(are\\s+)?(animals|vermin|filth|disease|subhuman|inferior|savages)\\b`, "i"),
] as const;

const CHARACTER_MAP: Record<string, string> = {
   "0": "o",
   "1": "i",
   "2": "z",
   "3": "e",
   "4": "a",
   "5": "s",
   "6": "g",
   "7": "t",
   "8": "b",
   "9": "g",
   "@": "a",
   $: "s",
   "!": "i",
   "|": "i",
   "+": "t",
};

export function normalizeModerationText(input: string) {
   return input
      .normalize("NFKC")
      .toLowerCase()
      .split("")
      .map((character) => CHARACTER_MAP[character] ?? character)
      .join("")
      .replace(/(.)\1{2,}/g, "$1$1")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
}

function escapeRegExp(value: string) {
   return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildBlockedPattern(term: string) {
   const normalizedTerm = normalizeModerationText(term);
   const words = normalizedTerm.split(/\s+/);

   const wordPatterns = words.map((word) =>
      word
         .split("")
         .map((character) => `${escapeRegExp(character)}+`)
         .join("\\s*"),
   );

   return new RegExp(`(^|\\s)${wordPatterns.join("\\s+")}(?=\\s|$)`, "i");
}

const BLOCKED_PATTERNS = BLOCKED_TERMS.map(buildBlockedPattern);

export function moderateText(input: string): ModerationResult {
   const normalized = normalizeModerationText(input);

   if (!normalized) {
      return { allowed: true };
   }

   if (BLOCKED_PATTERNS.some((pattern) => pattern.test(normalized))) {
      return {
         allowed: false,
         reason: "blocked_term",
         message: FRONT_OFFICE_MODERATION_MESSAGE,
      };
   }

   if (HATE_PATTERNS.some((pattern) => pattern.test(normalized))) {
      return {
         allowed: false,
         reason: "hate_pattern",
         message: FRONT_OFFICE_MODERATION_MESSAGE,
      };
   }

   return { allowed: true };
}

export function moderateFields(values: Array<string | null | undefined>): ModerationResult {
   return moderateText(values.filter((value): value is string => typeof value === "string").join(" "));
}

export function assertModeratedText(input: string) {
   const result = moderateText(input);

   if (!result.allowed) {
      throw new Error(result.message ?? FRONT_OFFICE_MODERATION_MESSAGE);
   }

   return input.trim();
}
