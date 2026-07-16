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
];
