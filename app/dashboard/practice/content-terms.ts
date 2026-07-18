// Key Terms glossary for the Practice hub. Static content, no DB.

export type KeyTerm = {
  term: string;
  /** One-sentence plain-English definition. */
  plain: string;
  deeper: {
    /** How it's calculated / what it actually covers. */
    detail: string;
    /** Why it matters. */
    why: string;
    /** A common interview trap. */
    trap: string;
  };
};

export const KEY_TERMS: KeyTerm[] = [
  {
    term: "EBITDA",
    plain:
      "A company's operating profit before interest, taxes, depreciation, and amortization — a rough proxy for the cash its operations generate.",
    deeper: {
      detail:
        "Start from operating income (EBIT) and add back D&A — or net income + interest + taxes + D&A. There's no strict GAAP definition, which is why \"adjusted EBITDA\" can hide a lot.",
      why: "It strips out capital structure (interest), tax jurisdiction, and asset-accounting choices, making very different companies roughly comparable — which is why EV/EBITDA is everywhere.",
      trap: "\"Is EBITDA a good proxy for cash flow?\" Only partially — it ignores capex, working capital, and taxes. Capital-intensive companies can post fat EBITDA while burning cash.",
    },
  },
  {
    term: "Enterprise Value",
    plain:
      "What the whole operating business is worth to everyone who funds it — equity holders and lenders alike.",
    deeper: {
      detail:
        "Equity value + total debt + preferred stock + noncontrolling interests − cash. Debt gets added because a buyer assumes or repays it; cash is subtracted because the buyer effectively gets it back.",
      why: "It's capital-structure-neutral, so it's the numerator for multiples on operating metrics like EV/EBITDA and EV/Revenue.",
      trap: "\"Can EV be negative?\" Yes — when cash exceeds market cap plus debt. Equity value, on the other hand, can't go below zero.",
    },
  },
  {
    term: "Equity Value",
    plain:
      "The value of the business belonging to shareholders only — for a public company, its market cap.",
    deeper: {
      detail:
        "Share price × fully diluted shares outstanding: count in-the-money options via the treasury stock method, plus RSUs and convertibles.",
      why: "It's what you pair with post-interest metrics like net income (P/E), and it's what an acquirer actually pays shareholders.",
      trap: "Using basic instead of diluted shares. Dilution can move the number several percent — and interviewers check.",
    },
  },
  {
    term: "WACC",
    plain:
      "The blended rate of return everyone funding the company demands — the discount rate in a DCF.",
    deeper: {
      detail:
        "(E/V) × cost of equity + (D/V) × after-tax cost of debt, weighted at market values. Cost of equity comes from CAPM: risk-free rate + beta × equity risk premium.",
      why: "It converts future cash flows into today's dollars — and small changes in WACC swing a DCF's answer a lot.",
      trap: "\"Why is debt cheaper than equity?\" It's paid first and interest is tax-deductible — but pile on too much and both costs rise, so WACC is U-shaped in leverage.",
    },
  },
  {
    term: "DCF",
    plain:
      "A valuation that says a business is worth the future cash it will generate, discounted back to today.",
    deeper: {
      detail:
        "Project unlevered free cash flows for 5–10 years, add a terminal value, discount everything at WACC to get enterprise value, then subtract net debt for equity value.",
      why: "The most \"intrinsic\" of the main methods — you own every assumption instead of borrowing the market's.",
      trap: "Terminal value is usually 60–80% of the total. If yours is 95%, your projection window or assumptions are broken — and interviewers will ask.",
    },
  },
  {
    term: "LBO",
    plain:
      "Buying a company mostly with borrowed money and letting its own cash flows pay the debt down.",
    deeper: {
      detail:
        "A private equity sponsor funds 50–70% of the price with debt; returns come from debt paydown, EBITDA growth, and multiple expansion at exit.",
      why: "It's the core PE playbook, and bankers run \"LBO floor\" analyses to estimate the most a sponsor could pay.",
      trap: "\"What makes a good LBO target?\" Stable cash flows, low capex, little existing debt. A flashy high-growth cash-burner is exactly wrong.",
    },
  },
  {
    term: "Accretion / Dilution",
    plain:
      "Whether a deal makes the buyer's earnings per share go up (accretive) or down (dilutive).",
    deeper: {
      detail:
        "Combine both companies' net income, add after-tax synergies, subtract new deal costs (interest on deal debt, foregone interest on cash), divide by the new share count, and compare to the buyer's standalone EPS.",
      why: "Boards and markets fixate on EPS impact, so it's the first screen run on any public deal.",
      trap: "Quick rule for all-stock deals: buyer's P/E above the seller's → accretive. But accretive ≠ good deal — you can accretively overpay.",
    },
  },
  {
    term: "Multiples (EV/EBITDA, P/E)",
    plain:
      "Price tags expressed as ratios — how many dollars you pay per dollar of EBITDA or earnings.",
    deeper: {
      detail:
        "EV/EBITDA divides enterprise value by EBITDA (capital-structure-neutral); P/E divides share price by earnings per share. Compare against similar companies to judge cheap vs expensive.",
      why: "Multiples are the market's shorthand for growth, returns, and risk — the working language of comps and precedent transactions.",
      trap: "Numerator–denominator mismatch: EV over net income, or equity value over EBITDA, is an instant red flag.",
    },
  },
  {
    term: "Working Capital",
    plain:
      "The cash tied up in day-to-day operations — inventory and receivables, minus what you owe suppliers.",
    deeper: {
      detail:
        "Net working capital = current operating assets (receivables, inventory) − current operating liabilities (payables, accruals). The period-over-period change is what hits free cash flow.",
      why: "Growth eats cash: sell more and receivables and inventory balloon before the cash actually arrives.",
      trap: "\"If working capital increases, what happens to cash?\" Cash goes down. The sign flip trips people up constantly.",
    },
  },
  {
    term: "CapEx",
    plain:
      "Money spent on long-lived assets — buildings, machines, servers — rather than day-to-day expenses.",
    deeper: {
      detail:
        "Shows up in investing activities on the cash flow statement, lands on the balance sheet as PP&E, then flows through the income statement over years as depreciation.",
      why: "It's the gap between EBITDA and real cash flow, and diligence splits it into maintenance vs growth spend.",
      trap: "Capex never hits the income statement when spent — depreciation does, over time. Mixing that up unravels the classic \"depreciation up $10\" question.",
    },
  },
  {
    term: "Free Cash Flow",
    plain:
      "The cash left after running and reinvesting in the business — what's genuinely available to investors.",
    deeper: {
      detail:
        "Unlevered FCF = EBIT × (1 − tax rate) + D&A − capex − increase in net working capital. \"Levered\" FCF also subtracts interest — know which one is being asked about.",
      why: "It's the substance behind a DCF and the debt-paydown engine in an LBO. Earnings are an opinion; cash is a fact.",
      trap: "Discounting levered FCF at WACC (or unlevered FCF at the cost of equity) mixes frameworks — and gets flagged instantly.",
    },
  },
  {
    term: "CAGR",
    plain:
      "The smoothed annual growth rate between two points in time, as if growth were perfectly steady.",
    deeper: {
      detail:
        "(Ending ÷ Beginning)^(1 ÷ years) − 1. Revenue going from 100 to 121 over two years = (121 ÷ 100)^(1/2) − 1 = 10%.",
      why: "It's how growth is quoted in every model and memo — \"a 15% revenue CAGR\" is a complete sentence in finance.",
      trap: "CAGR hides the path: 0% then 21% prints the same as 10% and 10%. And never average yearly growth rates — that overstates it.",
    },
  },
  {
    term: "Synergies",
    plain:
      "The extra value from combining two companies — costs you can cut or revenue you can only earn together.",
    deeper: {
      detail:
        "Cost synergies (shared overhead, procurement, facilities) are credible and get modeled; revenue synergies (cross-selling) are speculative and get discounted by everyone.",
      why: "Synergies are what justify paying a control premium — the gap between the price paid and standalone value.",
      trap: "\"Why do most mergers fail to create value?\" Buyers pay for synergies upfront, then have to actually deliver them. Stay skeptical of revenue synergies in any answer.",
    },
  },
  {
    term: "Due Diligence",
    plain:
      "The deep homework a buyer or investor does on a company before signing anything.",
    deeper: {
      detail:
        "Workstreams cover financial (quality of earnings), legal, tax, commercial (market and customers), and operational — run through data rooms, expert calls, and management sessions.",
      why: "It's where deals die or get repriced — and as a junior banker or consultant, a big chunk of the actual day job.",
      trap: "In interviews, \"diligence\" is also what YOU'RE expected to have done: on the firm, the group, and the people you've talked to.",
    },
  },
  {
    term: "Net Debt",
    plain:
      "Total debt minus cash — what the company would still owe if it emptied its pockets today.",
    deeper: {
      detail:
        "Total debt (plus debt-like items such as certain leases and pensions) − cash and equivalents. It's the bridge between enterprise value and equity value.",
      why: "Deals are struck \"cash-free, debt-free\" — net debt is the adjustment that reconciles headline price with what shareholders receive.",
      trap: "Direction errors: EV = equity value + net debt, so equity value = EV − net debt. Sign mistakes here are the most common bridge fumble.",
    },
  },
  {
    term: "IRR",
    plain:
      "The annualized return an investment earns — the discount rate that makes its cash flows net to zero today.",
    deeper: {
      detail:
        "For a simple in-and-out investment: (exit ÷ entry)^(1 ÷ years) − 1. Doubling your money in 5 years ≈ 15% IRR; in 3 years ≈ 26%.",
      why: "It's the scoreboard in private equity — funds typically underwrite deals to a 20%+ IRR.",
      trap: "IRR is time-sensitive where multiple-of-money isn't: 2.0x in three years is a great IRR, 2.0x in ten years is mediocre. Quote both.",
    },
  },
  {
    term: "Leverage",
    plain:
      "Debt used to amplify returns — it makes good outcomes better and bad outcomes worse.",
    deeper: {
      detail:
        "Measured as debt/EBITDA (\"levered 5x\") or debt/equity. More leverage means every dollar of upside accrues to a thinner slice of equity.",
      why: "It's the L in LBO and the reason equity returns can triple while the underlying business only grows 30%.",
      trap: "Leverage doesn't create value by itself — it concentrates it. If cash flows wobble, the exact same math runs in reverse.",
    },
  },
  {
    term: "Comps",
    plain:
      "Valuing a company by looking at what similar companies trade for — or recently sold for.",
    deeper: {
      detail:
        "Trading comps use public peers' current multiples; precedent transactions use past M&A deals, which embed a control premium. Pick a peer set, spread the multiples, apply the range.",
      why: "The most-used method in practice: fast, market-based, and the first thing an MD asks to see.",
      trap: "\"Which runs higher, comps or precedents?\" Usually precedents, because of the control premium. And a lazy peer set poisons everything downstream.",
    },
  },
  {
    term: "IPO",
    plain:
      "A private company selling shares to the public for the first time and listing on an exchange.",
    deeper: {
      detail:
        "Banks underwrite it: craft the equity story, file the S-1, run the roadshow, price the deal, and allocate shares. Equity capital markets (ECM) drives the process.",
      why: "It's a marquee exit for founders and sponsors, and IPO advisory is core investment banking work.",
      trap: "\"Why do IPOs pop on day one?\" Deliberate underpricing — great for the new buyers, costly for the sellers. A nuanced take here reads very well.",
    },
  },
  {
    term: "Bulge Bracket",
    plain:
      "The biggest global full-service investment banks — Goldman Sachs, Morgan Stanley, JPMorgan and peers.",
    deeper: {
      detail:
        "Typically GS, MS, JPMorgan, BofA, Citi, Barclays, UBS, and Deutsche Bank. Contrast with elite boutiques (Evercore, Lazard, Centerview, PJT, Moelis) and middle-market firms (Houlihan Lokey, William Blair).",
      why: "Recruiting shorthand — \"BB vs EB vs MM\" describes platform breadth, deal size, and exit paths, and people will assume you know it.",
      trap: "Don't rank firms carelessly in an interview. \"Why us\" should be about the group and the people, never the league table.",
    },
  },
  {
    term: "MBB",
    plain:
      "McKinsey, Bain, and BCG — the big three strategy consulting firms.",
    deeper: {
      detail:
        "The consulting analog of the bulge bracket, sitting above tier-2 strategy firms (Kearney, Oliver Wyman, L.E.K.) and the Big 4's consulting arms.",
      why: "The label also tells you how to prep: McKinsey runs interviewer-led cases, while Bain and BCG are mostly candidate-led.",
      trap: "Each firm believes its culture is genuinely distinct — \"why Bain?\" cannot be answered with \"because MBB.\"",
    },
  },
  {
    term: "Sell-Side vs Buy-Side",
    plain:
      "Sell-side firms (banks, brokers) sell services and securities; buy-side firms (PE, hedge funds, asset managers) invest money.",
    deeper: {
      detail:
        "Sell-side work: advisory, underwriting, research, market-making. Buy-side work: deploying capital — private equity, hedge funds, mutual funds, pensions.",
      why: "It's the axis the whole industry organizes around, including the classic banking-to-PE career pipeline.",
      trap: "In an M&A context the words flip meaning: a \"sell-side process\" just means the bank represents the seller. Context matters.",
    },
  },
  {
    term: "EBIT",
    plain:
      "Operating income — profit from running the business, before interest and taxes take their cut.",
    deeper: {
      detail:
        "Revenue − COGS − operating expenses (including D&A). It's EBITDA minus depreciation & amortization, which is why asset-heavy companies show a much bigger gap between the two.",
      why: "It captures operating performance while still charging the business for wearing out its assets — many argue EV/EBIT is a fairer multiple than EV/EBITDA for capital-intensive companies.",
      trap: "\"Walk from EBIT to unlevered free cash flow\": EBIT × (1 − tax rate) + D&A − CapEx − change in working capital. Interviewers love this bridge.",
    },
  },
  {
    term: "Terminal Value",
    plain:
      "The chunk of a DCF that captures everything after your projection window — usually most of the total.",
    deeper: {
      detail:
        "Two methods: Gordon growth (final-year FCF × (1+g) ÷ (WACC − g), with g around 2–3%) or an exit multiple (final-year EBITDA × a comps-based multiple). Both get discounted back to today.",
      why: "It typically carries 60–80% of a DCF's value, so tiny changes in the growth rate or exit multiple swing the whole answer.",
      trap: "Using a growth rate above the economy's long-run growth — the company would eventually BE the economy. Interviewers check whether your g makes sense.",
    },
  },

  /* ---- The three statements & their line items ---- */
  {
    term: "Income Statement",
    plain:
      "The report that shows whether the company made money over a period — revenue at the top, profit at the bottom.",
    deeper: {
      detail:
        "Revenue − COGS = gross profit; subtract operating expenses like SG&A and R&D for operating income (EBIT); then interest and taxes take their cut down to net income. It's built on accrual accounting, so revenue is booked when earned, not when the cash arrives.",
      why: "Every profitability number interviewers ask about — gross margin, EBIT, net income, EPS — lives here, and it's where the classic three-statement walk starts.",
      trap: "\"Is net income cash?\" No — accrual timing and non-cash charges like D&A drive a wedge between profit and cash. That gap is exactly what the cash flow statement exists to bridge.",
    },
  },
  {
    term: "Balance Sheet",
    plain:
      "A snapshot of what the company owns, what it owes, and what's left for shareholders — frozen at a single date.",
    deeper: {
      detail:
        "Assets (cash, receivables, inventory, PP&E) on one side; liabilities (payables, debt) plus shareholders' equity on the other. Assets = Liabilities + Equity, always — and unlike the other two statements, it's a point-in-time photo, not a period.",
      why: "Every three-statement question ends here: whatever the transaction, the balance sheet has to balance, which is how interviewers check you actually understand the linkages.",
      trap: "Saying a balance sheet covers \"the year.\" It doesn't — it's one date. Mixing up a snapshot (balance sheet) with a flow (income statement) reads as a fundamentals gap.",
    },
  },
  {
    term: "Cash Flow Statement",
    plain:
      "The statement that tracks actual cash moving in and out — the bridge from accounting profit to money in the bank.",
    deeper: {
      detail:
        "Three sections: operations (net income plus non-cash add-backs like D&A, adjusted for working capital swings), investing (capex, acquisitions), and financing (debt raised or repaid, dividends, buybacks). The bottom line — the net change in cash — becomes the cash balance on the next balance sheet.",
      why: "Cash is the hardest number to dress up, and companies fail by running out of cash, not by reporting accounting losses — which is why \"pick one statement\" is answered with this one.",
      trap: "Forgetting the sign flips: working capital going UP means cash going DOWN. The add-back logic in the operations section is where most three-statement walks fall apart.",
    },
  },
  {
    term: "Net Income",
    plain:
      "The famous \"bottom line\" — profit left for shareholders after every expense, including interest and taxes.",
    deeper: {
      detail:
        "Revenue minus everything: COGS, operating expenses, D&A, interest, and taxes. It's also the thread stitching the statements together — it tops the cash flow statement and flows into retained earnings on the balance sheet.",
      why: "It's the E in P/E and EPS, so equity investors — and accretion/dilution math — live and die by it.",
      trap: "Pairing it with enterprise value. Net income belongs to shareholders only, so it goes with equity value (P/E) — EV ÷ net income is the classic mismatch red flag.",
    },
  },
  {
    term: "D&A",
    plain:
      "Depreciation and amortization — spreading the cost of big purchases over the years they're used, on paper rather than in cash.",
    deeper: {
      detail:
        "Buy a $50M machine and the income statement charges, say, $5M a year for ten years instead of $50M at once (depreciation; amortization is the same idea for intangibles). No cash leaves when the charge hits — the cash left when the asset was bought.",
      why: "It's the classic non-cash charge, so it gets added back on the cash flow statement — and it's the entire difference between EBIT and EBITDA.",
      trap: "The \"depreciation up $10\" question: with taxes, net income falls $7 but cash goes UP $3. Forget that D&A is non-cash and the whole walk collapses.",
    },
  },
  {
    term: "PP&E",
    plain:
      "Property, plant & equipment — the long-lived physical stuff a company owns: buildings, machines, vehicles, servers.",
    deeper: {
      detail:
        "Sits on the balance sheet at cost minus accumulated depreciation (\"net PP&E\"). Capex adds to it each year; depreciation wears it back down.",
      why: "It's the balance-sheet home of capex and the source of depreciation, so it appears in nearly every three-statement walk.",
      trap: "In the \"depreciation up $10\" question, forgetting that net PP&E falls $10 on the asset side is what stops the balance sheet from balancing.",
    },
  },
  {
    term: "Gross Margin",
    plain:
      "The percentage of each sales dollar left after paying the direct cost of the product itself.",
    deeper: {
      detail:
        "(Revenue − COGS) ÷ revenue. A 40% gross margin means each $1 of sales leaves $0.40 to cover everything else — overhead, marketing, R&D — before any profit.",
      why: "It's the purest read on pricing power and product economics, and margin bridges (\"why did gross margin fall 250bps?\") are consulting-case bread and butter.",
      trap: "Confusing gross margin (after COGS only) with operating or net margin (after much more). Saying which margin you mean, unprompted, is an easy credibility win.",
    },
  },
  {
    term: "COGS",
    plain:
      "Cost of goods sold — what it directly costs to make or deliver the thing you're selling.",
    deeper: {
      detail:
        "Materials, factory labor, freight — costs that scale with each unit sold. It's the first subtraction on the income statement, and it excludes overhead like HQ rent or the sales team (that's SG&A).",
      why: "Revenue − COGS = gross profit, so where a cost gets classified decides which margin it hits — and which lever a case asks you to pull.",
      trap: "Sorting costs wrong in a case: a delivery company's drivers are COGS, but its accountants are SG&A. Fixed-vs-variable and COGS-vs-SG&A are different cuts — don't blur them.",
    },
  },
  {
    term: "SG&A",
    plain:
      "Selling, general & administrative costs — the overhead of running the company: salaries, rent, marketing, back office.",
    deeper: {
      detail:
        "Everything operating that isn't directly making the product: sales teams, executives, HR, legal, office space, advertising. It sits below gross profit on the income statement and mostly doesn't scale one-for-one with volume.",
      why: "It's the first place everyone hunts for cost savings — in consulting cases and merger synergies (\"combine the back offices\") alike.",
      trap: "Calling SG&A entirely fixed. Chunks of it (commissions, marketing) flex with revenue — the split matters when a case asks what happens if volume drops 20%.",
    },
  },
  {
    term: "NOPAT",
    plain:
      "Net operating profit after tax — what the company would earn if it had no debt: operating profit with taxes taken out.",
    deeper: {
      detail:
        "EBIT × (1 − tax rate). It taxes operating profit directly and ignores the interest deduction, giving a clean, capital-structure-free profit number.",
      why: "It's the first line of the unlevered free cash flow build (NOPAT + D&A − capex − working capital change), so every DCF starts here.",
      trap: "Using net income instead of NOPAT in unlevered FCF — net income already reflects interest, so you'd be mixing levered and unlevered math.",
    },
  },

  /* ---- Valuation & deals ---- */
  {
    term: "Precedent Transactions",
    plain:
      "Valuing a company by looking at prices actually paid in past takeovers of similar companies.",
    deeper: {
      detail:
        "Collect recent M&A deals in the sector, spread the multiples paid (usually EV/EBITDA), and apply that range to your target. Because buyers pay for control and synergies, these multiples run above trading comps.",
      why: "One of the three core valuation methods — and the go-to answer for \"which method gives the highest value?\"",
      trap: "Treating old deals as current truth. A 2021 multiple tells you about the 2021 market, and deal-specific quirks (auctions, synergies) can make any single precedent misleading.",
    },
  },
  {
    term: "Cost of Equity",
    plain:
      "The return shareholders demand for taking the risk of owning the stock — the expensive half of WACC.",
    deeper: {
      detail:
        "Estimated with CAPM: risk-free rate + beta × equity risk premium. Beta measures how much the stock swings with the market — swingier businesses get a higher beta, and therefore a pricier cost of equity.",
      why: "It's usually the biggest input to WACC, and it's the right discount rate for equity-only (levered) cash flows.",
      trap: "\"Why is cost of equity higher than cost of debt?\" Shareholders get paid last and are promised nothing — more risk, more required return. Tax-deductible interest widens the gap further.",
    },
  },
  {
    term: "Cost of Debt",
    plain:
      "The interest rate a company would pay to borrow money today.",
    deeper: {
      detail:
        "Take the yield on the company's existing debt (or what lenders would charge now), then multiply by (1 − tax rate) — interest is tax-deductible, so the government effectively picks up part of the bill.",
      why: "It's the cheaper half of WACC, and the tax shield on interest is a big part of why leverage can juice returns.",
      trap: "Using the coupon on old debt instead of today's yield. Cost of debt is what borrowing costs NOW, not what it cost when the bonds were issued.",
    },
  },
  {
    term: "Control Premium",
    plain:
      "The extra amount a buyer pays over the market price to own the whole company and call the shots.",
    deeper: {
      detail:
        "Buyers typically pay 20–40% over the pre-announcement share price, justified by synergies and the value of controlling decisions — strategy, management, dividends. Precedent transactions bake this premium in; trading comps don't.",
      why: "It's the standard explanation for why precedent transactions run above trading comps — and it's the bar synergies have to clear to justify a deal.",
      trap: "\"Why pay above the market price?\" Because the market price buys one passive share, not the steering wheel. Miss that logic and the comps-vs-precedents answer unravels.",
    },
  },
  {
    term: "Quality of Earnings",
    plain:
      "How trustworthy and repeatable a company's reported profits are — recurring earnings versus one-time or accounting-flattered ones.",
    deeper: {
      detail:
        "Diligence teams strip out one-time items, check how revenue is recognized, and flag accounting choices (like capitalizing costs instead of expensing them) that dress up EBITDA. The formal version is a QofE report from an accounting firm.",
      why: "A dollar of recurring earnings deserves a higher multiple than a dollar of one-offs — and QofE findings routinely reprice or kill deals.",
      trap: "Taking \"adjusted EBITDA\" at face value. Every add-back is a claim, and interviewers like candidates who instinctively ask what's hiding in the adjustments.",
    },
  },
  {
    term: "Market Technicals",
    plain:
      "Price moves driven by trading dynamics — who's buying and selling and why — rather than the business itself.",
    deeper: {
      detail:
        "Takeover speculation, index inclusion (funds forced to buy), analyst coverage changes, short squeezes, big holders entering or exiting. None of them change the company's cash flows.",
      why: "They explain why a stock can move when fundamentals didn't — a useful bucket in any \"what drives a share price?\" answer.",
      trap: "Attributing every move to fundamentals. Sorting fundamental drivers from technical ones shows a maturity most candidates skip.",
    },
  },

  /* ---- LBO return levers ---- */
  {
    term: "Debt Paydown",
    plain:
      "Using the company's own cash flow to shrink its debt — one of the three ways an LBO makes money.",
    deeper: {
      detail:
        "Every dollar of debt repaid shifts a dollar of value from the lenders' claim to the sponsor's equity, even if the business never gets more valuable. Buy with heavy debt, pay half of it down, and equity grows with zero growth.",
      why: "It's the most controllable of the three LBO return levers (paydown, EBITDA growth, multiple expansion) — which is why stable cash flows top the good-target checklist.",
      trap: "\"Can an LBO work with no growth?\" Yes — debt paydown alone can clear the return bar. Forget that lever and the whole LBO model looks like a growth bet.",
    },
  },
  {
    term: "Multiple Expansion",
    plain:
      "Selling the company at a higher multiple than you paid — the market simply values each dollar of earnings more at exit.",
    deeper: {
      detail:
        "Buy at 8x EBITDA and sell at 10x, and equity value jumps even with flat EBITDA. It can come from better market sentiment, a bigger and higher-quality business at exit, or plain luck on timing.",
      why: "It's the third LBO return lever — and the one sponsors are least willing to bet on, since it's mostly out of their control.",
      trap: "Baking multiple expansion into base-case returns. The conservative assumption is exit multiple = entry multiple; anything more should be justified, not assumed.",
    },
  },

  /* ---- Consulting ---- */
  {
    term: "Candidate-led vs Interviewer-led",
    plain:
      "The two case interview formats: either you drive the problem-solving roadmap (candidate-led) or the interviewer walks you through set questions (interviewer-led).",
    deeper: {
      detail:
        "Bain and BCG mostly run candidate-led cases — you structure the problem, pick the next branch, and push toward a recommendation. McKinsey runs interviewer-led — they steer between questions and you go deep on each one.",
      why: "The format changes how you prep: candidate-led rewards owning the roadmap and driving forward; interviewer-led rewards crisp, complete answers to each prompt.",
      trap: "Waiting for direction in a candidate-led case. If it's your case to drive, silence isn't the interviewer being unhelpful — it's the test.",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Hover-glossary aliases                                              */
/* ------------------------------------------------------------------ */

// Phrases that light up as hoverable wherever they appear in Practice
// content, mapped to the KEY_TERMS entry that explains them. Overlapping
// phrases are resolved longest-first by the matcher.
export const TERM_ALIASES: Record<string, string[]> = {
  EBITDA: ["EBITDA"],
  EBIT: ["EBIT", "operating income"],
  "Enterprise Value": ["enterprise value", "EV"],
  "Equity Value": ["equity value", "market cap", "market capitalization"],
  WACC: ["WACC", "cost of capital", "discount rate"],
  DCF: ["DCF", "DCFs", "discounted cash flow"],
  LBO: ["LBO", "LBOs", "leveraged buyout"],
  "Accretion / Dilution": ["accretion/dilution", "accretive", "dilutive"],
  "Multiples (EV/EBITDA, P/E)": ["EV/EBITDA", "P/E", "multiples"],
  "Working Capital": [
    "changes in working capital",
    "change in working capital",
    "working capital changes",
    "net working capital",
    "working capital",
    "working-capital",
    "NWC",
  ],
  CapEx: ["capex", "capital expenditures", "capital expenditure"],
  "Free Cash Flow": [
    "unlevered free cash flows",
    "unlevered free cash flow",
    "free cash flows",
    "free cash flow",
    "UFCF",
    "FCF",
  ],
  CAGR: ["CAGR"],
  Synergies: ["synergies", "synergy"],
  "Due Diligence": ["due diligence"],
  "Net Debt": ["net debt"],
  IRR: ["IRR"],
  Leverage: ["leverage", "levered", "unlevered"],
  Comps: ["comps", "comparable companies", "trading comps"],
  IPO: ["IPO", "IPOs"],
  "Bulge Bracket": ["bulge bracket", "bulge-bracket"],
  MBB: ["MBB"],
  "Sell-Side vs Buy-Side": ["sell-side", "buy-side", "sell side", "buy side"],
  "Terminal Value": ["terminal value", "Gordon growth"],
  "Income Statement": ["income statement", "income statements"],
  "Balance Sheet": ["balance sheet", "balance sheets"],
  "Cash Flow Statement": [
    "cash flow statement",
    "cash flow statements",
    "net change in cash",
  ],
  "Net Income": ["net income"],
  "D&A": [
    "D&A",
    "depreciation and amortization",
    "depreciation & amortization",
    "non-cash charges",
    "non-cash charge",
    "depreciation",
    "amortization",
  ],
  "PP&E": ["PP&E", "property, plant and equipment"],
  "Gross Margin": ["gross margin", "gross margins", "gross profit"],
  COGS: ["COGS", "cost of goods sold"],
  "SG&A": ["SG&A"],
  NOPAT: ["NOPAT"],
  "Precedent Transactions": [
    "precedent transactions",
    "precedent transaction",
    "precedents",
  ],
  "Cost of Equity": ["cost of equity", "CAPM"],
  "Cost of Debt": ["cost of debt"],
  "Control Premium": ["control premium", "control premiums"],
  "Quality of Earnings": ["quality of earnings", "QofE"],
  "Market Technicals": ["market technicals"],
  "Debt Paydown": ["debt paydown"],
  "Multiple Expansion": ["multiple expansion"],
  "Candidate-led vs Interviewer-led": ["candidate-led", "interviewer-led"],
};
