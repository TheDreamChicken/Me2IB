// Static prep content for the Practice hub. No DB — this is study material.

export type ContentBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "example"; items: string[] };

export type PracticeItem = {
  question: string;
  answer: ContentBlock[];
};

export type PracticeTabValue = "finance" | "consulting" | "behavioral";

export type PracticeTab = {
  value: PracticeTabValue;
  label: string;
  intro: string;
  goDeeper: string;
  items: PracticeItem[];
};

/* ------------------------------------------------------------------ */
/* Finance technicals                                                  */
/* ------------------------------------------------------------------ */

const FINANCE_ITEMS: PracticeItem[] = [
  {
    question: "Walk me through the three financial statements.",
    answer: [
      {
        type: "p",
        text: "Together, the three statements tell you how a company performs, what it owns and owes, and where its cash actually goes.",
      },
      {
        type: "list",
        items: [
          "**Income statement** — profitability over a period. Revenue, minus COGS (gross profit), minus operating expenses like SG&A and R&D (operating income / EBIT), minus interest and taxes, down to net income.",
          "**Balance sheet** — a snapshot at a point in time. What the company owns (assets: cash, receivables, inventory, PP&E), what it owes (liabilities: payables, accrued expenses, debt), and shareholders' equity. It must always balance: Assets = Liabilities + Equity.",
          "**Cash flow statement** — bridges accrual accounting to actual cash over a period. Starts with net income, adds back non-cash items (D&A, stock-based comp) and adjusts for working capital changes (cash from operations), then shows investing activities (capex, acquisitions) and financing activities (debt issued or repaid, dividends, buybacks), ending in the net change in cash.",
        ],
      },
      {
        type: "p",
        text: "Classic follow-up: \"If you could only pick one statement to judge a company's health?\" The standard answer is the cash flow statement — cash is the hardest thing to manipulate, and companies fail by running out of cash, not by reporting accounting losses.",
      },
    ],
  },
  {
    question: "How do the three statements link together?",
    answer: [
      {
        type: "steps",
        items: [
          "**Net income** from the bottom of the income statement is the top line of the cash flow statement, and flows into retained earnings within shareholders' equity on the balance sheet.",
          "On the cash flow statement, **non-cash charges** (like D&A) are added back to net income, and **changes in working capital** items from the balance sheet (receivables, inventory, payables) increase or decrease cash from operations.",
          "Investing and financing items tie back to the balance sheet: **capex increases PP&E** while D&A reduces it; debt raised or repaid changes the debt balance; buybacks and dividends reduce equity.",
          "The **net change in cash** at the bottom of the cash flow statement becomes the cash balance on the next balance sheet — and with cash and retained earnings updated, the balance sheet balances.",
        ],
      },
      {
        type: "p",
        text: "Interviewers want to hear the loop closed: income statement → cash flow statement → balance sheet, ending with \"and the balance sheet balances.\"",
      },
    ],
  },
  {
    question: "Depreciation goes up by $10 — walk me through the impact.",
    answer: [
      {
        type: "p",
        text: "State your tax assumption out loud first — assume a **30% tax rate** here. Always go in order: income statement, then cash flow statement, then balance sheet.",
      },
      {
        type: "steps",
        items: [
          "**Income statement:** operating income falls by $10. Taxes fall by $3 (30% of $10), so net income falls by **$7**.",
          "**Cash flow statement:** net income is down $7, but depreciation is non-cash, so you add back the full $10. Cash from operations — and total cash — is **up $3**.",
          "**Balance sheet:** on the assets side, cash is up $3 and net PP&E is down $10, so total assets are down $7. On the other side, retained earnings fall $7 through net income. Both sides are down $7 — **it balances**.",
        ],
      },
      {
        type: "p",
        text: "The takeaway they're testing: higher depreciation actually **increases cash** in the period because of the tax shield — the $3 of taxes you didn't pay.",
      },
    ],
  },
  {
    question: "What's the difference between enterprise value and equity value?",
    answer: [
      {
        type: "list",
        items: [
          "**Equity value** (market cap) = share price × fully diluted shares outstanding. It's the value of the business attributable to equity holders only.",
          "**Enterprise value** = equity value + total debt + preferred stock + noncontrolling interests − cash and equivalents. It's the value of the company's core operations to **all** capital providers.",
        ],
      },
      {
        type: "p",
        text: "Intuition: debt is added because a buyer must assume or repay it; cash is subtracted because it's a non-operating asset the buyer effectively gets back at closing. That's why EV is capital-structure-neutral — two identical businesses with different debt loads have the same EV.",
      },
      {
        type: "p",
        text: "Pair multiples consistently: EV goes with metrics available to all investors (revenue, EBITDA, EBIT); equity value goes with post-interest metrics (net income, so P/E). Something like EV / net income is a classic red flag. Bonus point: equity value can't go below zero, but enterprise value can be negative (a big cash pile against a small market cap).",
      },
    ],
  },
  {
    question: "What are the three main valuation methodologies?",
    answer: [
      {
        type: "list",
        items: [
          "**Comparable companies (trading comps):** apply the valuation multiples (EV/EBITDA, EV/Revenue, P/E) of similar public companies to your target's metrics. Market-based and current, but reflects no control premium — and truly comparable companies are rare.",
          "**Precedent transactions:** apply multiples paid in past M&A deals for similar companies. Captures a control premium so it tends to produce the highest values, but data can be stale and deal-specific (synergies, competitive auctions).",
          "**Discounted cash flow (DCF):** project unlevered free cash flows and discount them at WACC. The most theoretically rigorous — value is intrinsic rather than market-implied — but highly sensitive to assumptions.",
        ],
      },
      {
        type: "p",
        text: "Common follow-up: \"Which gives the highest value?\" Usually precedent transactions because of the control premium, but the honest answer is \"it depends\" — a DCF with aggressive assumptions can top anything. Bankers also often run an LBO analysis as a floor: the maximum a financial sponsor could pay and still hit its return target.",
      },
    ],
  },
  {
    question: "Walk me through a DCF.",
    answer: [
      {
        type: "steps",
        items: [
          "Project **unlevered free cash flow** for 5–10 years. Revenue growth and margin assumptions drive EBIT; then unlevered FCF = EBIT × (1 − tax rate) + D&A − capex − increase in net working capital.",
          "Estimate **terminal value** for everything beyond the projection window: either the Gordon growth method — final-year FCF × (1 + g) / (WACC − g), with g near long-run GDP growth of ~2–3% — or an exit multiple applied to final-year EBITDA.",
          "**Discount** each year's FCF and the terminal value back to today at WACC. The sum is enterprise value.",
          "Bridge to **equity value**: subtract net debt (plus preferred and minority interest), then divide by fully diluted shares for the implied share price.",
        ],
      },
      {
        type: "p",
        text: "Then sanity-check it. Terminal value is often more than half of total value — if it's 90%, your window is too short or your assumptions are off. Always sensitize the output across a range of WACC and terminal growth rates, and cross-check the implied multiples against comps.",
      },
    ],
  },
  {
    question: "What is WACC and how do you calculate it?",
    answer: [
      {
        type: "p",
        text: "WACC — the weighted average cost of capital — is the blended required return of everyone who funds the company, and the discount rate for unlevered free cash flows in a DCF.",
      },
      {
        type: "p",
        text: "**WACC = (E/V) × cost of equity + (D/V) × cost of debt × (1 − tax rate)**, with weights at market values (plus a preferred stock term if applicable).",
      },
      {
        type: "list",
        items: [
          "**Cost of equity** comes from CAPM: risk-free rate + beta × equity risk premium. Beta is usually derived from comparables — unlever each comp's beta to strip out its capital structure, take the median, then relever at the target's structure.",
          "**Cost of debt** is what the company would pay to borrow today (the yield on its debt), tax-adjusted because interest is deductible.",
        ],
      },
      {
        type: "p",
        text: "Intuition worth saying: debt is cheaper than equity — it's paid first and the interest is tax-deductible — so some leverage lowers WACC. But past a point more debt makes both debt and equity riskier and WACC rises again.",
      },
    ],
  },
  {
    question: "Why might two similar companies trade at different multiples?",
    answer: [
      {
        type: "p",
        text: "A multiple is compressed shorthand for a DCF — so anything that changes expected cash flow growth, returns, or risk changes the multiple, even between \"similar\" companies.",
      },
      {
        type: "list",
        items: [
          "**Growth:** faster expected revenue or EBITDA growth earns a higher multiple.",
          "**Margins and returns:** higher margins and return on invested capital mean more free cash flow per dollar of EBITDA.",
          "**Risk profile:** customer concentration, cyclicality, leverage, regulatory exposure, geography — riskier cash flows get discounted harder.",
          "**Quality of earnings:** recurring vs one-time revenue; accounting choices (capitalizing vs expensing costs) can flatter EBITDA.",
          "**Size and liquidity:** larger companies with liquid stock typically command a premium.",
          "**Market technicals:** takeover speculation, index inclusion, analyst coverage, shareholder register.",
        ],
      },
      {
        type: "p",
        text: "A strong answer picks two or three drivers and ties them back to the core idea: multiples are just shorthand for growth, returns, and risk.",
      },
    ],
  },
  {
    question: "Walk me through an LBO conceptually.",
    answer: [
      {
        type: "p",
        text: "In a leveraged buyout, a private equity firm buys a company using a large amount of debt — often 50–70% of the purchase price — and the company's own cash flows service and repay that debt. The classic analogy: buying a rental property with a mortgage. Small down payment, the tenant's rent pays the loan down, and you keep the upside when you sell.",
      },
      {
        type: "steps",
        items: [
          "**Buy:** fund the purchase with debt plus a sponsor equity check. The target's cash flows and asset base support the borrowing.",
          "**Hold (typically 3–7 years):** use free cash flow to pay down debt while growing EBITDA — organic growth, margin improvement, bolt-on acquisitions.",
          "**Exit:** sell to a strategic buyer or another sponsor, or IPO. Returns come from three levers: **debt paydown**, **EBITDA growth**, and **multiple expansion**.",
        ],
      },
      {
        type: "p",
        text: "Good LBO candidates have stable, predictable cash flows, low capex needs, a defensible market position, little existing debt, and a strong management team. Sponsors typically underwrite to roughly a 20%+ IRR, or 2–3x their invested capital.",
      },
    ],
  },
  {
    question: "\"Why investment banking?\" — how to frame your answer.",
    answer: [
      {
        type: "p",
        text: "Not a technical question, but it sinks more candidates than accounting ever does. The interviewer is testing whether you understand what the job actually is and have a credible, personal reason for wanting it.",
      },
      {
        type: "steps",
        items: [
          "**Spark:** a specific origin — a class, a stock pitch, a deal you followed, a family business being sold. Concrete beats grand.",
          "**Verification:** what you did to test the interest — finance club, relevant coursework, internships, coffee chats with analysts. This is where answers win or lose.",
          "**Why this role specifically:** what banking offers that alternatives don't — live deal exposure early, a steep learning curve, working alongside management teams, the blend of analytical rigor and client work.",
          "**Why it fits your path:** connect it to how you want to grow. Keep it about the job in front of you, not an exit-options speech.",
        ],
      },
      {
        type: "p",
        text: "Avoid: money and prestige, \"I thrive in fast-paced environments,\" and paraphrasing the firm's website. Do: name specific people you've spoken to and what they told you about the group — it proves the diligence is real. Have a firm-specific version ready for every interview.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Consulting cases                                                    */
/* ------------------------------------------------------------------ */

const CONSULTING_ITEMS: PracticeItem[] = [
  {
    question: "How a case interview actually works.",
    answer: [
      {
        type: "p",
        text: "A case is a 25–40 minute simulation of a real client problem. You're graded less on finding \"the answer\" and more on how you structure ambiguity, handle numbers under pressure, and communicate.",
      },
      {
        type: "steps",
        items: [
          "**Prompt:** the interviewer reads a short scenario — \"Your client's profits fell 20% last year. Why, and what should they do?\" Take notes, then play the question back to confirm the objective.",
          "**Clarify:** ask one to three questions about the goal, the client's business model, and constraints. Clarify — don't fish for the answer.",
          "**Structure:** ask for a minute, sketch a framework tailored to this case, then walk the interviewer through it top-down.",
          "**Analysis:** work the branches using data the interviewer provides — charts, tables, math. State your approach before calculating, and end every number with what it means.",
          "**Recommendation:** synthesize answer-first — \"I recommend X, for three reasons\" — then support, risks, and next steps.",
        ],
      },
      {
        type: "p",
        text: "Two formats to practice: **candidate-led** (Bain, BCG — you drive the roadmap and decide where to go next) and **interviewer-led** (McKinsey — they steer between questions and you go deep on each one).",
      },
    ],
  },
  {
    question: "The profitability framework, walked through.",
    answer: [
      {
        type: "p",
        text: "Profit = Revenue − Costs. Nearly every profitability case starts from this identity and drills into which side broke.",
      },
      {
        type: "list",
        items: [
          "**Revenue = price × volume**, segmented wherever useful: by product line, customer type, channel, or geography. Ask which segment moved.",
          "**Costs = fixed + variable**: COGS, labor, rent, marketing, logistics. Distinguish unit-cost increases from volume-driven changes.",
        ],
      },
      {
        type: "p",
        text: "Then diagnose like a doctor: which line item moved, when did it start, is it company-specific or industry-wide (how are competitors doing?), and is it isolated to one segment or geography? Each answer prunes half the tree.",
      },
      {
        type: "p",
        text: "Finally, match the fix to the cause — pricing action, mix shift, cost restructuring, supplier renegotiation, or exiting an unprofitable segment — and quantify the impact of your recommendation whenever the data allows.",
      },
    ],
  },
  {
    question: "The market entry framework.",
    answer: [
      {
        type: "p",
        text: "\"Should our client enter market X?\" Structure it around four questions, then commit to a recommendation.",
      },
      {
        type: "steps",
        items: [
          "**Is the market attractive?** Size (estimate it if needed), growth rate, profitability and margins, regulation, customer trends.",
          "**Can we win?** Competitive landscape — who holds share, how concentrated it is, what would differentiate the client, and how incumbents might retaliate.",
          "**Do we have the right to play?** Client capabilities: brand, distribution, technology, synergies with the core business, and the gaps that need filling.",
          "**Do the economics work?** Entry mode — build organically, acquire, or partner/JV — plus investment required, realistic share capture, and time to break even.",
        ],
      },
      {
        type: "p",
        text: "Close with a clear go/no-go and conditions: \"Enter via a partnership if we can secure distribution; revisit in twelve months if share is below 5%.\" Cases reward candidates who actually reach a decision.",
      },
    ],
  },
  {
    question: "Market sizing, with a worked example.",
    answer: [
      {
        type: "p",
        text: "Market sizing tests structured estimation, not trivia. Worked example: **\"How many cups of coffee does Chicago drink per day?\"**",
      },
      {
        type: "steps",
        items: [
          "**Population:** Chicago proper is roughly 2.7M people.",
          "**Adults:** about 75% → 2.7M × 0.75 ≈ **2M adults**.",
          "**Coffee drinkers:** assume ~60% of adults drink coffee → 2M × 0.6 = **1.2M drinkers**.",
          "**Cups per day:** the average drinker has about 2 cups → 1.2M × 2 = **2.4M cups**.",
          "**Adjust:** add roughly 10% for commuters, tourists, and coffee-drinking teenagers → **≈2.6–2.7M cups per day**. Call it 2.5–3M.",
        ],
      },
      {
        type: "p",
        text: "**Sanity check:** that's about one cup per resident per day — plausible. Always close a sizing with a check like this; catching your own unreasonable answer scores points.",
      },
      {
        type: "p",
        text: "Method notes: state every assumption out loud and invite correction; round aggressively but track the direction of the error; and pick top-down (population → filters) or bottom-up (coffee shops × cups sold per shop) — then offer the other as a cross-check.",
      },
    ],
  },
  {
    question: "Mental math tips that hold up under pressure.",
    answer: [
      {
        type: "list",
        items: [
          "**Round, then correct:** 297 × 21 ≈ 300 × 21 = 6,300, then subtract 3 × 21 ≈ 60 → about 6,240. Always know which direction you rounded.",
          "**Strip the zeros:** 350 × 12,000 → 35 × 12 = 420, add back four zeros → 4.2M. Handle digits and magnitude separately.",
          "**Build percentages from 10% and 1%:** 17% of 340 = 10% (34) + 5% (17) + 2% (6.8) ≈ 58.",
          "**Break up multiplication:** 18 × 35 = (20 × 35) − (2 × 35) = 700 − 70 = 630.",
          "**Label everything:** write K / M / B next to every number as you go. Magnitude errors kill more cases than arithmetic errors.",
          "**Narrate while you calculate:** \"I'll take 10% and double it\" — the interviewer can follow along and course-correct you early.",
          "**Drill daily:** ten minutes a day of percentages, large multiplication, and growth rates for two or three weeks before interviews compounds fast.",
        ],
      },
    ],
  },
  {
    question: "Top mistakes candidates make.",
    answer: [
      {
        type: "list",
        items: [
          "**Forcing a memorized framework** onto a case it doesn't fit. Build the structure from this problem, not from a book.",
          "**Jumping into math without a plan.** State the approach — \"Revenue is price × volume, so I need both\" — before touching numbers.",
          "**Skipping clarifying questions** — or asking so many that it reads as fishing for the answer.",
          "**Ignoring the \"so what.\"** Every calculation should end with what it means for the client's decision.",
          "**Spiraling after an error.** Everyone slips on arithmetic; the differentiator is catching it, fixing it calmly, and moving on.",
          "**Missing interviewer hints.** If they ask \"is there anything else that could drive this?\" — there is.",
          "**Weak synthesis.** Ending with a recap of the data instead of a recommendation. Always close answer-first.",
          "**Forgetting presence.** A case is also a client-readiness test: composure, eye contact, and structured speech all count.",
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Behavioral                                                          */
/* ------------------------------------------------------------------ */

const BEHAVIORAL_ITEMS: PracticeItem[] = [
  {
    question: "The STAR method, with a fully worked answer.",
    answer: [
      {
        type: "p",
        text: "STAR keeps behavioral answers structured and tight: **S**ituation, **T**ask, **A**ction, **R**esult. Aim for 90 seconds to 2 minutes, with most of the time on Action.",
      },
      {
        type: "list",
        items: [
          "**Situation (~15s):** just enough context to understand the stakes.",
          "**Task (~10s):** what you, specifically, were responsible for.",
          "**Action (~45–60s):** the steps you took — \"I,\" not \"we.\" This is what gets graded.",
          "**Result (~15s):** a quantified outcome, plus one sentence on what you learned or changed.",
        ],
      },
      {
        type: "p",
        text: "**Worked example — \"Tell me about a time you led a team under pressure\":**",
      },
      {
        type: "example",
        items: [
          "**Situation:** \"Junior year, I led a four-person team in our university's case competition. Two days before the final round, the organizers ruled our core dataset out of bounds — about 60% of our analysis depended on it.\"",
          "**Task:** \"As team lead, I had to rebuild the analysis in 48 hours and keep the team functional while everyone also had midterms.\"",
          "**Action:** \"I triaged the deck into what survived and what didn't, split the rebuild into three workstreams matched to each person's strengths, and replaced ad-hoc messages with two 30-minute check-ins a day. I took the hardest piece — rebuilding the market model from public filings — myself, and made the call to cut two slides we could no longer defend rather than patch them.\"",
          "**Result:** \"We presented on time and took second out of eighteen teams, and the judges specifically praised the rigor of the rebuilt model. Since then I stress-test every analysis with a 'what breaks if this input disappears' check.\"",
        ],
      },
      {
        type: "p",
        text: "Why it works: specific numbers, clear personal ownership, a real trade-off (cutting slides), and a lesson that transfers to the job.",
      },
    ],
  },
  {
    question: "The 6 stories that cover 90% of questions.",
    answer: [
      {
        type: "p",
        text: "You don't need forty prepared answers. Six well-built stories, each flexible enough to re-angle, cover the vast majority of behavioral questions.",
      },
      {
        type: "steps",
        items: [
          "**Leadership** — you organized people toward an outcome. Covers: leading a team, motivating others, stepping up, delegating.",
          "**Teamwork & conflict** — you disagreed with someone and resolved it well. Covers: difficult teammate, conflict, receiving feedback, persuading within a team.",
          "**Failure or setback** — something went genuinely wrong and you owned it. Covers: failure, weaknesses (paired with growth), handling criticism.",
          "**Achievement under constraint** — your proudest result against a deadline or a resource crunch. Covers: biggest accomplishment, working under pressure, prioritization.",
          "**Persuasion / influence** — you changed a decision without having authority. Covers: influencing up, selling an idea, negotiation.",
          "**Initiative / analytical win** — you spotted a problem, dug in, and fixed it with analysis. Covers: problem-solving, going beyond your role, attention to detail.",
        ],
      },
      {
        type: "p",
        text: "For each story, prepare a full 2-minute STAR version and a 30-second short version. In the room, map the story to the question asked — re-angle it, don't recite it.",
      },
    ],
  },
  {
    question: "Delivery tips — how the best answers sound.",
    answer: [
      {
        type: "list",
        items: [
          "**Headline first:** open with the one-line summary — \"This is a time I turned around a failing project\" — then tell the story. Structure shows before you've said thirty words.",
          "**\"I\" over \"we\":** credit the team, but be explicit about what you personally did. Interviewers can't hire the team.",
          "**Quantify:** numbers make stories credible — team size, timeline, percentage improvement, final ranking.",
          "**Don't memorize word-for-word:** scripted answers sound flat and collapse under follow-ups. Memorize the beats; practice out loud until it flows.",
          "**Watch the clock:** two minutes, then stop talking. Interviewers will follow up on what interests them — leave room.",
          "**Answer the question actually asked:** the same story is told differently for \"tell me about a failure\" versus \"tell me about pressure.\" Emphasize the relevant beat.",
          "**Manage energy:** sit up, slow down slightly, pause instead of saying \"um.\" Enthusiasm for your own story is contagious — and so is boredom.",
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export const PRACTICE_TABS: PracticeTab[] = [
  {
    value: "finance",
    label: "Finance technicals",
    intro:
      "The ten questions below cover the core technical ground for IB and finance first rounds. Read an answer, close it, then try to reproduce it out loud — that's the rep that counts.",
    goDeeper:
      "Want the full 400-question guides and modeling prep? Head to",
    items: FINANCE_ITEMS,
  },
  {
    value: "consulting",
    label: "Consulting cases",
    intro:
      "How cases actually work, the two frameworks you'll really use, a worked market sizing, and the math habits that keep you calm when the interviewer is watching.",
    goDeeper:
      "For casebooks and live case-partner communities, browse",
    items: CONSULTING_ITEMS,
  },
  {
    value: "behavioral",
    label: "Behavioral",
    intro:
      "Behavioral answers win offers more often than technicals do. Build six great stories and learn to deliver them like a human, not a script.",
    goDeeper:
      "For more question banks and firm-specific behavioral guides, see",
    items: BEHAVIORAL_ITEMS,
  },
];
