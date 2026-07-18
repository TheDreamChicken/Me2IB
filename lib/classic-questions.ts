import type { STORY_CATEGORIES } from "@/lib/constants";

export type StoryCategoryValue = (typeof STORY_CATEGORIES)[number]["value"];

export type ClassicQuestion = {
  question: string;
  category: StoryCategoryValue;
  /** Asked in almost every finance/consulting interview. */
  starred?: boolean;
};

/**
 * The canonical behavioral + fit question bank, phrased the way interviewers
 * actually ask them. Grouped by STORY_CATEGORIES value; starred questions are
 * the ones that show up in nearly every first round and superday.
 */
export const CLASSIC_QUESTIONS: ClassicQuestion[] = [
  /* General behavioral ------------------------------------------------ */
  { question: "Tell me about yourself", category: "behavioral", starred: true },
  {
    question: "Walk me through your resume",
    category: "behavioral",
    starred: true,
  },
  {
    question: "Why should we hire you over the other candidates we're seeing?",
    category: "behavioral",
    starred: true,
  },
  {
    question: "What accomplishment are you most proud of, and why?",
    category: "behavioral",
  },
  {
    question: "Tell me something about you that isn't on your resume",
    category: "behavioral",
  },
  {
    question: "Tell me about a time you had to learn something completely new, fast",
    category: "behavioral",
  },
  {
    question:
      "Tell me about a time you juggled several competing deadlines. How did you prioritize?",
    category: "behavioral",
  },

  /* Leadership --------------------------------------------------------- */
  {
    question: "Tell me about a time you led a team",
    category: "leadership",
    starred: true,
  },
  {
    question: "Tell me about a time you showed initiative",
    category: "leadership",
  },
  {
    question:
      "Tell me about a time you influenced people without having formal authority",
    category: "leadership",
  },
  {
    question: "Describe a time you had to motivate a team that had checked out",
    category: "leadership",
  },
  {
    question:
      "Tell me about a decision you made that was unpopular. How did you handle it?",
    category: "leadership",
  },
  {
    question: "Tell me about a time you had to deliver difficult feedback",
    category: "leadership",
  },

  /* Teamwork ----------------------------------------------------------- */
  {
    question: "Tell me about a time you worked on a team with conflict",
    category: "teamwork",
    starred: true,
  },
  {
    question: "Tell me about a time you disagreed with a teammate. What did you do?",
    category: "teamwork",
  },
  {
    question: "Describe a time you had to work closely with a difficult person",
    category: "teamwork",
  },
  {
    question: "What role do you naturally take on a team?",
    category: "teamwork",
  },
  {
    question: "Tell me about a time a team you were on missed its goal",
    category: "teamwork",
  },
  {
    question: "Tell me about a time you had to earn a group's trust quickly",
    category: "teamwork",
  },

  /* Challenge / failure ------------------------------------------------ */
  {
    question: "Tell me about a time you failed",
    category: "challenge",
    starred: true,
  },
  {
    question: "Tell me about a time you faced a challenge",
    category: "challenge",
  },
  {
    question: "Tell me about the most difficult problem you've had to solve",
    category: "challenge",
  },
  {
    question:
      "Tell me about a time you received tough criticism. How did you respond?",
    category: "challenge",
  },
  {
    question: "Tell me about a time you made a mistake. What did you do next?",
    category: "challenge",
  },
  {
    question:
      "Tell me about a time you had to make a decision without all the information",
    category: "challenge",
  },
  {
    question: "What's the biggest risk you've ever taken?",
    category: "challenge",
  },

  /* Why this firm ------------------------------------------------------ */
  { question: "Why this firm?", category: "why_firm", starred: true },
  { question: "What do you know about our firm?", category: "why_firm" },
  {
    question: "Who have you talked to at our firm, and what did you take away?",
    category: "why_firm",
  },
  {
    question: "Which other firms are you recruiting with?",
    category: "why_firm",
  },
  {
    question: "What differentiates us from our competitors?",
    category: "why_firm",
  },
  {
    question: "If you had offers from us and a competitor, how would you choose?",
    category: "why_firm",
  },

  /* Why this industry -------------------------------------------------- */
  {
    question: "Why investment banking?",
    category: "why_industry",
    starred: true,
  },
  { question: "Why consulting?", category: "why_industry", starred: true },
  { question: "Why this industry?", category: "why_industry" },
  {
    question: "How do you know this career is right for you?",
    category: "why_industry",
  },
  {
    question: "What do you think a first-year analyst actually does all day?",
    category: "why_industry",
  },
  {
    question: "How have you been preparing to break into this industry?",
    category: "why_industry",
  },

  /* Strengths & weaknesses --------------------------------------------- */
  {
    question: "What's your greatest strength?",
    category: "strengths_weaknesses",
    starred: true,
  },
  {
    question: "What's your greatest weakness?",
    category: "strengths_weaknesses",
    starred: true,
  },
  {
    question: "What would your last manager or team lead say you need to improve?",
    category: "strengths_weaknesses",
  },
  {
    question: "How would your friends describe you in three words?",
    category: "strengths_weaknesses",
  },
  {
    question:
      "What's a piece of hard feedback you've received, and what did you do about it?",
    category: "strengths_weaknesses",
  },
  {
    question: "What skill are you actively working on right now?",
    category: "strengths_weaknesses",
  },

  /* Technical ----------------------------------------------------------- */
  { question: "Walk me through a DCF", category: "technical", starred: true },
  {
    question: "How do the three financial statements link together?",
    category: "technical",
  },
  {
    question:
      "If depreciation increases by $10, walk me through the impact on all three statements",
    category: "technical",
  },
  {
    question: "What are the main valuation methods, and when would you use each?",
    category: "technical",
  },
  {
    question: "How would you value a company with negative earnings?",
    category: "technical",
  },
  {
    question: "Estimate the size of the U.S. coffee shop market",
    category: "technical",
  },
  {
    question: "Tell me about a recent deal or market story you've been following",
    category: "technical",
  },

  /* Other --------------------------------------------------------------- */
  {
    question: "Where do you see yourself in five years?",
    category: "other",
    starred: true,
  },
  {
    question: "Do you have any questions for me?",
    category: "other",
    starred: true,
  },
  {
    question: "If you couldn't work in this industry, what would you do instead?",
    category: "other",
  },
  {
    question: "Teach me something you know well in two minutes",
    category: "other",
  },
  {
    question: "If I gave you $1 million today, what would you do with it?",
    category: "other",
  },
];

/** The subset asked in almost every interview — used as the starter seed. */
export const STARRED_CLASSICS = CLASSIC_QUESTIONS.filter((q) => q.starred);
