// All FAQ copy lives here so the view component stays lean.
// Answers are structured blocks: paragraphs, bullet lists, and example panels.
// `**bold**` inside any text is rendered as emphasis by the view.

import type { ComponentType } from "react";
import {
  BookOpenText,
  CalendarClock,
  ClipboardList,
  Coffee,
  Compass,
  GraduationCap,
  Layers,
} from "lucide-react";

export type AnswerBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "example"; title: string; lines: string[] };

export type FaqItem = {
  id: string;
  question: string;
  answer: AnswerBlock[];
};

export type FaqSection = {
  id: string;
  title: string;
  blurb: string;
  icon: ComponentType<{ className?: string }>;
  items: FaqItem[];
};

export const FAQ_SECTIONS: FaqSection[] = [
  /* ---------------------------------------------------------------- */
  /* 1. The basics                                                     */
  /* ---------------------------------------------------------------- */
  {
    id: "basics",
    title: "The basics",
    blurb: "Start here if all of this is brand new. It was for everyone once.",
    icon: Compass,
    items: [
      {
        id: "basics-what-is-recruiting",
        question: "What even is “recruiting”?",
        answer: [
          {
            kind: "p",
            text: "“Recruiting” is the catch-all campus word for the process of landing a competitive business internship or job while you're still in school. It covers everything from figuring out which industries even exist, to networking with people who work in them, to applying, interviewing, and eventually signing an offer.",
          },
          {
            kind: "p",
            text: "What makes it different from normal job hunting is **structure and timing**. Fields like investment banking and consulting hire on a rigid, industry-wide calendar: everyone applies in roughly the same window, the interviews look similar across firms, and offers come out around the same time. So recruiting isn't one application — it's a season of your life that you plan for, often a year or more before you'd actually start working.",
          },
          {
            kind: "p",
            text: "The honest version: it's a grind. It's dozens of coffee chats, hundreds of emails, a spreadsheet full of deadlines, and a fair amount of rejection. But it's also a learnable game with mostly-published rules — and being organized and early counts for almost as much as being brilliant.",
          },
        ],
      },
      {
        id: "basics-why-so-early",
        question: "Why does everyone start so early?",
        answer: [
          {
            kind: "p",
            text: "Because firms keep moving their timelines earlier to lock down talent before their competitors do. Investment banks now open applications for **junior-summer internships in the spring of sophomore year**, which means students are networking for those seats in freshman spring and sophomore fall. Nobody thinks this is a good system — including the banks — but no single firm wants to be the one that waits.",
          },
          {
            kind: "p",
            text: "The practical consequence is that the process quietly rewards people who simply *knew about it early*. Students without finance parents or older friends in the industry lose time not because they're less capable, but because nobody told them the clock had started. That information gap is most of the reason this FAQ exists.",
          },
          {
            kind: "p",
            text: "Also honest: “early” matters most in finance and somewhat in consulting. Marketing, operations, corporate roles, and most of tech hire on saner timelines — junior fall and winter for the following summer. Don't let finance-timeline panic infect every other path.",
          },
        ],
      },
      {
        id: "basics-what-roles",
        question: "What roles do people actually mean when they say “recruiting”?",
        answer: [
          {
            kind: "p",
            text: "On most campuses, “recruiting” with no other words attached means investment banking or consulting, because those two have the loudest and earliest pipelines. But the umbrella is much wider:",
          },
          {
            kind: "list",
            items: [
              "**Investment banking (IB)** — advising companies on mergers, acquisitions, and raising money. Analyst roles are famous for long hours, high pay, and being a launchpad into private equity and other buy-side jobs.",
              "**Consulting** — advising companies on strategy and operations problems. Think MBB (McKinsey, Bain, BCG) down through Big 4 and boutiques. Case interviews instead of technicals, travel instead of all-nighters (mostly).",
              "**Sales & trading (S&T)** — the markets side of a bank. Faster feedback, market-driven days, better hours than IB, and a very different personality fit.",
              "**Asset management / buy-side (AM)** — investing money for clients. Great work, but far fewer undergrad seats, so most people route through IB or research first.",
              "**Corporate roles** — finance, marketing, operations, or HR inside a regular company (think F500 rotational and leadership programs). Less rigid pipelines, more normal hours, genuinely underrated.",
            ],
          },
          {
            kind: "p",
            text: "Every one of these is a legitimate path. The loudness of the IB/consulting pipeline says something about how those industries hire, not about which career is right for you.",
          },
        ],
      },
      {
        id: "basics-pipeline",
        question: "What does the internship pipeline actually look like?",
        answer: [
          {
            kind: "p",
            text: "For the structured paths, the real prize is the **junior-summer internship**, because it's the front door to the full-time job. The chain looks like: network → apply → interviews → internship offer → junior summer internship → **return offer** → full-time role after graduation.",
          },
          {
            kind: "p",
            text: "At banks and consulting firms, the large majority of each full-time analyst class comes from the previous summer's intern class. Return offer rates vary by firm and by year — anywhere from roughly half to nearly all of an intern class — but the point is the same: perform well for ten weeks and you can have a job locked up before senior year even starts.",
          },
          {
            kind: "p",
            text: "This is why sophomore year feels so high-stakes, and it's also why earlier internships — a freshman summer at a local wealth management shop, a sophomore stint at a boutique — are best understood as **stepping stones**, not destinations. Each one exists mainly to make the next application stronger.",
          },
        ],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* 2. Timelines                                                      */
  /* ---------------------------------------------------------------- */
  {
    id: "timelines",
    title: "Timelines",
    blurb: "When things actually happen — and what to do if you missed the start.",
    icon: CalendarClock,
    items: [
      {
        id: "timelines-finance",
        question: "What's the finance timeline?",
        answer: [
          {
            kind: "p",
            text: "For a junior-summer IB internship, the rough shape (US, and it drifts earlier most years):",
          },
          {
            kind: "list",
            items: [
              "**Freshman year** — learn the vocabulary, join a finance club, watch upperclassmen go through the process. Freshman summer: anything productive counts.",
              "**Sophomore fall** — networking begins in earnest: coffee chats with alumni and analysts. Diversity and sophomore “insight” programs open, and some feed directly into internship offers.",
              "**Sophomore winter–spring (roughly Jan–Apr)** — applications open for junior-summer internships. HireVues and first rounds roll out on a rolling basis almost immediately.",
              "**Sophomore spring–junior fall** — superdays and offers. Some firms fill their class by early summer; others recruit into junior fall.",
              "**Junior summer** — the internship itself, ending in a return-offer decision.",
            ],
          },
          {
            kind: "p",
            text: "Yes, that means applying roughly **16 months before the internship starts**. And because applications are rolling — firms interview as applications arrive — submitting early genuinely matters. Seats disappear while perfectionists polish their resumes.",
          },
        ],
      },
      {
        id: "timelines-consulting",
        question: "What's the consulting timeline?",
        answer: [
          {
            kind: "p",
            text: "Consulting runs roughly six months to a year behind banking, and it's a bit saner. For MBB junior-summer internships, applications typically open in the spring of sophomore year with deadlines in early summer, and interviews run late sophomore summer into junior fall. Tier 2 firms and Big 4 consulting mostly recruit in **junior fall** for the following summer.",
          },
          {
            kind: "p",
            text: "The other big difference: consulting recruiting is less about networking volume and more about **case interview prep**. Coffee chats still help (and some firms track “engagement”), but nobody networks their way past a bad case. Budget serious time — most successful candidates do 20–40 live practice cases with partners, not just reading casebooks.",
          },
          {
            kind: "p",
            text: "Consulting also has a real second bite of the apple: full-time recruiting in senior fall is a genuine, well-trodden path, unlike banking where the full-time market is mostly leftovers from summer classes.",
          },
        ],
      },
      {
        id: "timelines-everything-else",
        question: "What's the timeline for everything else?",
        answer: [
          {
            kind: "p",
            text: "Much more forgiving. Marketing, corporate finance, operations, HR, and most F500 leadership programs post junior-summer internships in **junior fall and winter**, and they actually hire off the application itself — networking helps but isn't the gate. Tech runs its own cycle (big companies open applications August–October of junior year; startups hire whenever they need someone, often spring).",
          },
          {
            kind: "p",
            text: "For freshman and sophomore summers in any field: local businesses, research with a professor, small wealth-management or PE shops, startups, nonprofits. These don't follow a national calendar at all — there's no portal, which is good news, because it means you can make your own luck by emailing people in March when everyone else has given up.",
          },
        ],
      },
      {
        id: "timelines-late",
        question: "I'm “late.” Is it over?",
        answer: [
          {
            kind: "p",
            text: "No — though the internet will tell you otherwise with total confidence. Missing the “official” window closes some doors and leaves plenty open:",
          },
          {
            kind: "list",
            items: [
              "**Boutique and regional banks** recruit later (junior fall and winter), often through direct outreach rather than portals. Many don't even post internships — they hire whoever emails them a decent resume at the right time.",
              "**Middle-market firms** sometimes run later waves or reopen for spots that fell through. Keep checking; keep networking.",
              "**Off-cycle, fall, and spring internships** exist, especially at smaller shops — and they either convert or become the credential that gets you the next thing.",
              "**Full-time recruiting** is real. Plenty of people who missed junior-summer IB land full-time roles senior year off the back of a strong alternative internship plus relentless networking.",
              "**Master's programs** (MSF, MMS, MiM) are a legitimate — if expensive — reset button that puts you back into a structured recruiting pipeline.",
            ],
          },
          {
            kind: "p",
            text: "What actually kills late candidates isn't the calendar — it's quitting the networking because it “feels too late.” Analysts answer cold emails in October too. The person who sends 40 emails in junior fall beats the person who sent zero because a forum post said it was over.",
          },
        ],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* 3. The tiers explained                                            */
  /* ---------------------------------------------------------------- */
  {
    id: "tiers",
    title: "The tiers explained",
    blurb: "BB, EB, MM, MBB — what the alphabet soup means and how much it matters.",
    icon: Layers,
    items: [
      {
        id: "tiers-banks",
        question: "BB vs EB vs MM vs boutique — what's the difference?",
        answer: [
          {
            kind: "p",
            text: "Banks get sorted into tiers. Take the hierarchy with salt — it's real vocabulary, but it describes firms, not your worth:",
          },
          {
            kind: "list",
            items: [
              "**Bulge brackets (BB)** — the huge global banks: Goldman Sachs, Morgan Stanley, J.P. Morgan, Bank of America, Citi, Barclays, UBS. Pros: brand recognition everywhere, big intern classes, structured training, exposure to every product and industry. Cons: you're a smaller fish in a big class, group quality varies a lot inside the same bank, and there's real bureaucracy.",
              "**Elite boutiques (EB)** — smaller, advisory-focused firms: Evercore, Centerview, Lazard, PJT, Moelis, Perella Weinberg, Qatalyst. Pros: top-of-market pay, leaner deal teams (more responsibility earlier), excellent buy-side exits. Cons: tiny intern classes mean brutal odds, less name recognition outside finance, and fewer places to hide if a group is slow.",
              "**Middle market (MM)** — Jefferies, Houlihan Lokey, Baird, William Blair, Piper Sandler, Lincoln International. Pros: real deal flow, genuinely good cultures at several, strong regional footprints, more attainable seats. Cons: smaller deals, and prestige-obsessed people will be snobby about it — even though exits are perfectly fine (Houlihan's restructuring group, for one, out-exits plenty of BB groups).",
              "**Boutique / regional** — hundreds of small shops doing local M&A and advisory work. Pros: the easiest tier to break into through pure hustle, real responsibility fast, and perfect as a sophomore stepping stone or late-timeline entry. Cons: highly variable experience, little formal training, pay all over the map.",
            ],
          },
          {
            kind: "p",
            text: "Every tier has people who love it and people who fled. Day to day, your group and your staffer shape your life far more than the logo on the building.",
          },
        ],
      },
      {
        id: "tiers-consulting",
        question: "Consulting: MBB vs Tier 2 vs Big 4 vs boutique?",
        answer: [
          {
            kind: "list",
            items: [
              "**MBB** — McKinsey, Bain, BCG. The consulting equivalent of the bulge bracket, with the strongest brands and the broadest exits (private equity, strategy roles, business school admissions love them). The catch: single-digit acceptance rates, an up-or-out culture, and a lifestyle built around travel.",
              "**Tier 2** — Oliver Wyman, Strategy&, L.E.K., Kearney, Roland Berger. Serious strategy work, often deeper in a niche (Oliver Wyman in financial services, L.E.K. in healthcare and PE due diligence). Somewhat saner odds; exits remain strong, especially within their specialties.",
              "**Big 4 consulting** — Deloitte, EY, KPMG, PwC. Much bigger classes and a broader project mix — plenty of implementation and technology work alongside strategy. Honest take: meaningfully easier to land, a perfectly good career or springboard, and you should expect less pure “strategy” than the recruiting pitch implies.",
              "**Boutiques** — specialized shops, from healthcare strategy firms to economic consulting (Analysis Group, Cornerstone Research, Charles River). If the niche matches your interest, the work is often deeper and more analytical than generalist consulting. Narrower brand, though.",
            ],
          },
        ],
      },
      {
        id: "tiers-prestige",
        question: "Does prestige actually matter?",
        answer: [
          {
            kind: "p",
            text: "Sometimes — and less than the forums claim. The nuanced version:",
          },
          {
            kind: "p",
            text: "It matters most for your **first job's option value**. Certain buy-side and strategy employers recruit heavily from specific firms, and famous names survive resume screens run by people who have thirty seconds per resume. That effect is real and it would be dishonest to pretend otherwise.",
          },
          {
            kind: "p",
            text: "It matters much less after your second job. Once you have a track record, people hire the track record. And the finely-graded ladder — whether firm #4 outranks firm #6 — is mostly finance-internet brain. Outside that bubble, nobody is ranking Evercore against Goldman at dinner parties.",
          },
          {
            kind: "p",
            text: "Most importantly: the prestige-maximizing move is sometimes the wrong move. A strong group at a middle-market bank where you close deals teaches you more than a dead group at a bulge bracket. A boutique that hands you real responsibility beats a brand name where you shadow. Optimize for people who will actually teach you and work you'll actually do — the logo fades off your resume faster than you'd think.",
          },
        ],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* 4. Boosting your candidacy on campus                              */
  /* ---------------------------------------------------------------- */
  {
    id: "campus",
    title: "Boosting your candidacy on campus",
    blurb: "Clubs, GPA, projects, and the internships before the internship.",
    icon: GraduationCap,
    items: [
      {
        id: "campus-clubs",
        question: "Which clubs actually matter?",
        answer: [
          {
            kind: "p",
            text: "Finance and consulting clubs, case competition teams, and student investment funds matter — but mostly not for the resume line. They matter because the upperclassmen in them **just went through recruiting** and hand knowledge down: which firms are interviewing, what the technicals were this year, whose resume format works, which alumni actually respond. That information transfer is the real product.",
          },
          {
            kind: "p",
            text: "The selective ones (student-run funds, consulting groups that do real client work) do carry genuine resume weight, because firms know their alumni and recruit from them. Apply — and if you get rejected, it's genuinely fine. Join the less selective club, show up consistently, and start something small of your own. The knowledge is available either way; selectivity mostly gates the signaling, not the learning.",
          },
          {
            kind: "p",
            text: "One deep involvement where you can say “I ran this, here's what happened” beats five member-only lines. Interviewers always ask what you actually did. Have an answer.",
          },
        ],
      },
      {
        id: "campus-gpa",
        question: "The GPA question, honestly",
        answer: [
          {
            kind: "p",
            text: "Unofficial but real rules of thumb for banking and consulting: **3.5 is the soft floor** for resume screens. At 3.7+, GPA stops being a question. Between 3.3 and 3.5 you'll want a story and stronger everything-else, and some online portals hard-filter — though networking can pull an application out of the reject pile in a way a portal never will. Below that, lean hard on boutiques, later timelines, and relationships.",
          },
          {
            kind: "list",
            items: [
              "Leaving GPA off your resume reads as “below 3.5” to most screeners. If it's decent, show it.",
              "Major difficulty earns some credit in interviews, less in screens. An engineering 3.4 gets more sympathy from a human than from a filter.",
              "An upward trend is a fine story. “Freshman-year pre-med casualty turned economics major” is a well-worn and perfectly respectable arc.",
              "Don't nuke your GPA to stack club titles — the club line never outweighs the transcript hit.",
            ],
          },
          {
            kind: "p",
            text: "And keep perspective: GPA is a screen, not a ranking. Once you're in the room, nobody offers the 3.9 over the 3.6 because of the 0.3. They offer whoever they'd rather sit next to at 1am.",
          },
        ],
      },
      {
        id: "campus-projects",
        question: "Do projects and competitions actually help?",
        answer: [
          {
            kind: "p",
            text: "Yes — mostly because they generate **material you can talk about**. Interviews run on specifics, and “I built a model, here's what I got wrong” beats any amount of “I'm passionate about finance.”",
          },
          {
            kind: "p",
            text: "For finance, the single highest-ROI project is a **stock pitch**, even a completely self-directed one. Pick a company, build a simple valuation, write two pages on why it's mispriced. It teaches the vocabulary (multiples, DCF assumptions, catalysts) and hands you a ready answer to “pitch me a stock” — a question you will absolutely get.",
          },
          {
            kind: "p",
            text: "For consulting, case competitions plus one honest data project (scrape something, analyze it in Excel or Python, present a recommendation) cover the same ground. Winning is nice; having done the reps and being able to narrate them is the actual point.",
          },
        ],
      },
      {
        id: "campus-local-internships",
        question: "Are local or “no-name” internships worth it?",
        answer: [
          {
            kind: "p",
            text: "Extremely. A freshman or sophomore summer at a local wealth management office, a regional bank, a startup, or a professor's research project is one of the most reliable moves in the entire game — not because the work is glamorous, but because it (1) gives you concrete things to say in interviews, (2) proves you can function in an office, and (3) produces adults who will vouch for you.",
          },
          {
            kind: "p",
            text: "How to get one: there is no portal. Cold email 30 local firms — wealth managers, small PE shops, family offices, boutique banks — with three sentences and a resume. Most won't reply; a few will; one yes is all you need. The absence of a formal process is exactly why these are winnable as an underclassman.",
          },
          {
            kind: "p",
            text: "One reframe worth internalizing: recruiters reading a sophomore resume aren't comparing your no-name internship to Goldman. They're comparing it to the kids who did nothing.",
          },
        ],
      },
      {
        id: "campus-personal-projects",
        question: "What about personal projects?",
        answer: [
          {
            kind: "p",
            text: "Anything self-directed that produces an artifact: a blog where you break down deals in plain English, a paper-trading portfolio with written theses for every position, a tiny e-commerce or service business, a spreadsheet tool your club actually uses. The bar is “could I show this to someone,” not “is this impressive.”",
          },
          {
            kind: "p",
            text: "Two reasons these punch above their weight. Interviewers remember them — you become “the kid with the deals blog” instead of resume #40. And they're a networking cheat code: a coffee chat where you can say “I wrote something about the deal your group just closed” is a different conversation from “I'm hoping to learn more about the industry.”",
          },
        ],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* 5. Networking 101                                                 */
  /* ---------------------------------------------------------------- */
  {
    id: "networking",
    title: "Networking 101",
    blurb: "The part everyone dreads, demystified into a repeatable system.",
    icon: Coffee,
    items: [
      {
        id: "networking-what-it-is",
        question: "What is networking, actually?",
        answer: [
          {
            kind: "p",
            text: "Not schmoozing. Networking is two things: (1) **learning what jobs are actually like** from the people doing them, so you stop guessing, and (2) becoming a known, specific, liked person instead of resume #4,381 — because at most banks, interview lists are heavily influenced by which candidates the analysts and associates vouch for.",
          },
          {
            kind: "p",
            text: "The reframe that makes it bearable: you are not asking anyone for a job. You're asking for twenty minutes of someone's experience. People like talking about themselves, most of them remember being exactly where you are, and the industry explicitly runs on this — it's expected behavior, not an imposition. The awkwardness you feel is universal and it fades around coffee chat number five.",
          },
        ],
      },
      {
        id: "networking-coffee-chat",
        question: "What actually happens in a coffee chat?",
        answer: [
          {
            kind: "p",
            text: "A 15–30 minute call (rarely actual coffee) where you ask someone about their path, their group, and their day-to-day. You're being quietly evaluated on three things: did you prepare, are you genuinely curious, and are you normal to talk to. That's the whole rubric.",
          },
          {
            kind: "list",
            items: [
              "**First ~2 minutes** — your intro: name, school, year, one line on why you're interested, one line on what you've done. Rehearse this until it's smooth.",
              "**Middle ~15 minutes** — your questions: how they chose their firm, what their group is like, what surprised them, what they'd do differently. Questions Google can't answer.",
              "**Last ~5 minutes** — their questions for you, then the golden closer: “is there anyone else you'd suggest I talk to?” That one sentence is how one chat becomes five.",
            ],
          },
          {
            kind: "p",
            text: "Prepare 6–8 questions you actually care about, don't ask things the website answers, take notes right after, and send a short thank-you the same day. Then log it somewhere so you remember what you talked about three weeks later — you will not remember on your own.",
          },
        ],
      },
      {
        id: "networking-cold-email",
        question: "Anatomy of a cold email",
        answer: [
          {
            kind: "p",
            text: "Short, specific, easy to say yes to. The formula: who you are (one line), why *them* specifically (one line), a small ask (one line), a flexible close. Like this:",
          },
          {
            kind: "example",
            title: "Example cold email",
            lines: [
              "**Subject:** Northwestern sophomore — quick question about Evercore M&A",
              "Hi Sarah,",
              "I'm a sophomore at Northwestern studying economics. I found you through the alumni directory and saw you joined Evercore's M&A group after leading the investment club I just joined.",
              "Would you have 15 minutes in the next couple of weeks for a quick call? I'd love to hear how you chose an advisory-focused firm and what your first year has actually been like.",
              "Happy to work around your schedule — early mornings included. Thanks either way!",
              "Best,",
              "Alex Chen · (555) 010-2345 · linkedin.com/in/alexchen",
            ],
          },
          {
            kind: "p",
            text: "Why it works: the subject line carries the school and the reason. The body is four sentences. It asks for time, not a job or a referral. The specific detail (“the club I just joined”) proves it isn't a mass blast. Expect a 20–40% reply rate on well-targeted emails — silence isn't rejection, it's a busy inbox. Follow up once, politely, after about a week, then let it go.",
          },
        ],
      },
      {
        id: "networking-finding-alumni",
        question: "How do I find people to reach out to?",
        answer: [
          {
            kind: "list",
            items: [
              "**Your school's alumni database** or career-office platform — the single best source, because the shared school is a built-in reason to reply.",
              "**LinkedIn** — search your school + the firm, filter to analysts and associates (they respond far more than MDs). The firm's “People” tab sorted by school does most of the work.",
              "**Club alumni lists** — often the warmest leads you'll ever get; someone in your club knows someone at almost every firm.",
              "**Your existing network** — professors, family friends, teammates, your hometown. Any thread of commonality (same sport, same state, same weird major) measurably raises reply rates.",
              "**Second-degree intros** — end every chat with “anyone else I should talk to?” A warm intro converts at several times the rate of a cold email.",
            ],
          },
        ],
      },
      {
        id: "networking-cadence",
        question: "How often should I follow up?",
        answer: [
          {
            kind: "p",
            text: "After a chat: thank-you email the **same day** — three sentences, referencing something specific you discussed. Then roughly every 4–8 weeks, a genuine update: “I took your advice and joined the fund,” “I got the HireVue at your firm,” “I read that book you mentioned.” Updates give them something to respond to; “just checking in” gives them homework.",
          },
          {
            kind: "p",
            text: "Here's the uncomfortable truth about who gets referrals: it's almost never the smoothest talker. It's the person who kept in touch just enough that when the analyst gets the internal “anyone we should flag?” email, their name surfaces. That's the entire game, and it's won with a system — a list of names, last-contact dates, and next steps — not with charisma. (Keeping that system from living in your head is, not coincidentally, what me2IB is for.)",
          },
        ],
      },
      {
        id: "networking-referrals",
        question: "How do chats turn into referrals?",
        answer: [
          {
            kind: "p",
            text: "Mostly, you don't ask “will you refer me?” — you make it easy for them to offer. The refer-able signals: you prepared for every conversation, you followed their advice and reported back, you actually applied to their firm, and you know your own timeline. When someone says “let me know when you apply,” that is the offer. Take it.",
          },
          {
            kind: "p",
            text: "Near a deadline, it's fine to be direct with your strongest two or three contacts: “I'm submitting to X this week — is there anything you'd suggest, and would you feel comfortable flagging my application?” A warm analyst forwarding your resume to HR with two sentences attached is worth more than thirty additional cold applications.",
          },
          {
            kind: "p",
            text: "Two honest caveats. A referral gets you *looked at*, not hired — you still clear every interview yourself. And referrers spend real internal capital on you, so only ask people who've actually seen enough of you to vouch, and never burn one on a firm you'd decline.",
          },
        ],
      },
      {
        id: "networking-what-not-to-do",
        question: "What should I NOT do?",
        answer: [
          {
            kind: "list",
            items: [
              "Don't ask for a job or referral in the first email. That's asking a stranger to co-sign a loan.",
              "Don't open with “can you pass my resume along?” Attaching a resume for context is fine; making it the ask is not.",
              "Don't mass-email five people in the same group with identical text. They sit next to each other. They compare.",
              "Don't fake enthusiasm for a firm you can't describe, and don't bluff technical knowledge in a chat — “I haven't gotten there in my prep yet” is a completely respectable answer.",
              "Don't ghost after you get what you wanted, and don't drop people because their firm rejected you. People change firms; memories are long.",
              "Don't over-index on MDs. They're lovely, but analysts and associates are the ones asked “anyone we should interview?”",
              "Don't count a note-less LinkedIn connection request as networking. It's a bookmark, not a relationship.",
            ],
          },
        ],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* 6. Applications & interviews                                      */
  /* ---------------------------------------------------------------- */
  {
    id: "interviews",
    title: "Applications & interviews",
    blurb: "From resume drop to superday — what each stage is really testing.",
    icon: ClipboardList,
    items: [
      {
        id: "interviews-ocr",
        question: "OCR vs applying directly — what's the difference?",
        answer: [
          {
            kind: "p",
            text: "**On-campus recruiting (OCR)** means the firm hires through your school's career portal: info sessions, resume drops, sometimes interviews reserved for your school. If a firm recruits OCR at your school, use it — you're competing against your campus, not the entire country, and that's a much shorter line. **Direct applications** go through the firm's own portal, which you'll need for every firm that doesn't come to campus.",
          },
          {
            kind: "p",
            text: "Direct apps are where networking matters most, because there's no school pipeline protecting you — a referral or a friendly analyst is what lifts your application out of a pile of thousands. Honest note for semi-target and non-target students: fewer firms will come to you, so direct apps plus networking *are* your OCR. Your school's alumni inside each firm are the pipeline; you just have to assemble it by hand.",
          },
        ],
      },
      {
        id: "interviews-hirevue",
        question: "What's a HireVue / pre-recorded interview like?",
        answer: [
          {
            kind: "p",
            text: "A one-way video interview: a question appears on screen, you get ~30 seconds to think, then 1–3 minutes to record an answer to your webcam, usually with limited retakes. Banks use them as a first-round filter, so treat it as a real interview even though you're talking to a wall — everyone finds it dystopian, and everyone has to do it anyway.",
          },
          {
            kind: "list",
            items: [
              "Prepare your 60-second story plus 3–4 flexible anecdotes — the questions are overwhelmingly standard: why this firm, why this industry, a team conflict, a time you led.",
              "Look at the camera lens, not your own face. Practice recording yourself once or twice; the first take is always robotic.",
              "Dress business casual or better, find a boring background and decent light, and do it when you're fresh — not at 2am on deadline day.",
              "Keep answers structured: situation, action, result, done. Rambling past two minutes helps no one.",
            ],
          },
        ],
      },
      {
        id: "interviews-oa",
        question: "What are online assessments (OAs)?",
        answer: [
          {
            kind: "p",
            text: "Timed online tests used as early filters. Flavors vary: numerical and logical reasoning tests, situational judgment questions, behavioral “games” (pattern recognition, risk tasks), and consulting's custom ones — McKinsey's Solve game and similar. Some are hard to study for by design; the reasoning-style ones are absolutely practicable.",
          },
          {
            kind: "p",
            text: "Practical advice: do a few free numerical-reasoning practice sets so the format doesn't surprise you, take it on a real computer in a quiet hour when you're sharp, and read instructions slowly — a shocking number of people fail OAs from sloppiness rather than ability. For the game-based ones, sleep and focus beat cramming, because there's nothing to cram.",
          },
        ],
      },
      {
        id: "interviews-superday",
        question: "What's a superday?",
        answer: [
          {
            kind: "p",
            text: "The final round: several back-to-back interviews — typically three to five, 30 minutes each — with people from analyst up to MD, all in one day, virtual or in-office. Expect a mix of behavioral and technical from every interviewer, at unpredictable ratios. Decisions usually come within days, sometimes hours.",
          },
          {
            kind: "p",
            text: "What it's really testing is **consistency and stamina**. Your story has to be the same at 9am and 3pm, because the interviewers compare notes afterward — one “off” conversation can sink an otherwise strong day. Manage your energy, keep water nearby, ask different questions to each interviewer (they check), and write down names so your thank-you notes land correctly.",
          },
        ],
      },
      {
        id: "interviews-technical-behavioral",
        question: "How technical do interviews actually get?",
        answer: [
          {
            kind: "p",
            text: "IB interviews split roughly half and half. Behavioral: your story, why banking, why this firm, a conflict, a failure. Technical: accounting basics, walking through the three financial statements, enterprise vs. equity value, valuation methods, a simple DCF. The “400 Questions” guide is the canon — know it, because every other candidate does. First rounds stay lighter; superdays go deeper; boutiques sometimes go much deeper because you're interviewing with the person you'd sit next to.",
          },
          {
            kind: "p",
            text: "Consulting is behavioral (“fit”) plus **case interviews** — market sizing, profitability diagnostics, market entry. It's a different muscle entirely, built through live practice with partners, not by reading casebooks alone.",
          },
          {
            kind: "p",
            text: "The honest framing: technicals are a floor, not a ceiling. They filter out the unprepared, but they don't win offers — behaviorals do. Most post-superday rejections are “fit,” which is code for the stories and the energy, not the DCF.",
          },
        ],
      },
      {
        id: "interviews-thank-you",
        question: "Do thank-you notes matter?",
        answer: [
          {
            kind: "p",
            text: "Send them. Same day, three or four sentences, referencing something specific from the conversation, zero groveling. Will a thank-you note win you the offer? Almost never. Can its absence hurt at smaller firms where everyone compares notes in one room? Genuinely yes. It's a two-minute habit with positive expected value — the easiest trade in recruiting.",
          },
          {
            kind: "p",
            text: "For superdays, send individual notes to each interviewer — grab emails during the day, or route them through the recruiter with a line like “would you mind passing my thanks to the team?” Copy-pasting one note to five people who sit together is worse than sending none.",
          },
        ],
      },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* 7. Glossary                                                       */
  /* ---------------------------------------------------------------- */
  {
    id: "glossary",
    title: "Glossary",
    blurb: "Quick-hit definitions for the acronyms everyone pretends to know.",
    icon: BookOpenText,
    items: [
      {
        id: "glossary-coffee-chat",
        question: "Coffee chat",
        answer: [
          {
            kind: "p",
            text: "A 15–30 minute informal conversation (usually a call, rarely actual coffee) where you ask a professional about their path and their firm. The basic unit of networking: part learning, part becoming a name they remember.",
          },
        ],
      },
      {
        id: "glossary-referral",
        question: "Referral",
        answer: [
          {
            kind: "p",
            text: "An employee flagging your name or application internally — anything from a formal portal referral to forwarding your resume to HR with a good word. Gets you looked at, not hired; you still have to clear the interviews.",
          },
        ],
      },
      {
        id: "glossary-superday",
        question: "Superday",
        answer: [
          {
            kind: "p",
            text: "The final interview round: three to five back-to-back interviews with people across seniority levels in a single day. Interviewers compare notes afterward, so consistency across conversations is the hidden test.",
          },
        ],
      },
      {
        id: "glossary-ocr",
        question: "OCR",
        answer: [
          {
            kind: "p",
            text: "On-campus recruiting — firms hiring through your school's career center: info sessions, resume drops, and school-specific interview slots. A shorter line than the national applicant pool, so always use it where it exists.",
          },
        ],
      },
      {
        id: "glossary-bb-eb-mm",
        question: "BB / EB / MM",
        answer: [
          {
            kind: "p",
            text: "The bank tiers: **bulge bracket** (huge global banks — Goldman, J.P. Morgan, Morgan Stanley), **elite boutique** (smaller advisory-focused firms — Evercore, Centerview, PJT), and **middle market** (solid firms on smaller deals — Baird, Houlihan Lokey, William Blair).",
          },
        ],
      },
      {
        id: "glossary-mbb",
        question: "MBB",
        answer: [
          {
            kind: "p",
            text: "McKinsey, Bain, and BCG — the three most prestigious strategy consulting firms, spoken of as a unit the way “bulge bracket” is in banking.",
          },
        ],
      },
      {
        id: "glossary-oa",
        question: "OA",
        answer: [
          {
            kind: "p",
            text: "Online assessment — a timed test (numerical reasoning, logic, behavioral games, or consulting-specific games like McKinsey Solve) used to filter candidates before human interviews.",
          },
        ],
      },
      {
        id: "glossary-hirevue",
        question: "HireVue",
        answer: [
          {
            kind: "p",
            text: "A one-way recorded video interview: prompts appear on screen and you record timed answers to your webcam. Technically a brand name, used generically for any pre-recorded interview. Universally disliked, universally required.",
          },
        ],
      },
      {
        id: "glossary-networking-season",
        question: "Networking season",
        answer: [
          {
            kind: "p",
            text: "The months when everyone coffee-chats ahead of applications opening — roughly sophomore fall through early spring for finance. Chats still work outside the season; it's just when the volume peaks.",
          },
        ],
      },
      {
        id: "glossary-diversity-programs",
        question: "Diversity programs",
        answer: [
          {
            kind: "p",
            text: "Early insight and interview programs for students from underrepresented backgrounds, run by most large firms in freshman and sophomore year. Many feed directly into internship offers or accelerated interview processes — if you're eligible, these are some of the best-value applications in all of recruiting.",
          },
        ],
      },
      {
        id: "glossary-sophomore-programs",
        question: "Sophomore programs",
        answer: [
          {
            kind: "p",
            text: "Internships and multi-day insight events aimed at sophomores (sometimes freshmen), designed to build the firm's pipeline early. A sophomore program often comes with a fast track — or a direct offer — for the junior-summer internship.",
          },
        ],
      },
      {
        id: "glossary-return-offer",
        question: "Return offer",
        answer: [
          {
            kind: "p",
            text: "The full-time offer extended at the end of a summer internship. The whole pipeline points at this: most full-time analyst classes are hired out of the previous summer's intern class.",
          },
        ],
      },
      {
        id: "glossary-target",
        question: "Target / semi-target / non-target",
        answer: [
          {
            kind: "p",
            text: "Shorthand for how heavily firms recruit at a school: targets get dedicated pipelines and on-campus events, semi-targets get some, non-targets get none. It describes the default difficulty setting, not the outcome — non-target students break in every single year, mostly through networking and direct applications.",
          },
        ],
      },
    ],
  },
];
