// Worked examples for the meaty Finance/Consulting questions.
// Each has two versions: "simple" (non-business numbers, arithmetic fully
// shown) and "real" (interview-grade with proper terminology).

import type { WorkedExample } from "./content";

/* ------------------------------------------------------------------ */
/* Finance: DCF                                                        */
/* ------------------------------------------------------------------ */

export const DCF_EXAMPLE: WorkedExample = {
  simple: [
    {
      type: "p",
      text: "Your lemonade stand throws off **$100 of actual cash** this summer after lemons, cups, and the folding table. You expect **$110** next year and **$120** the year after. A friend offers to buy the whole stand today — what's it worth? Money later is worth less than money now, so discount everything at **10%**.",
    },
    {
      type: "steps",
      items: [
        "**Discount each year's cash back to today.** Year 1: $100 ÷ 1.10 = **$91**. Year 2: $110 ÷ 1.10² = $110 ÷ 1.21 = **$91**. Year 3: $120 ÷ 1.10³ = $120 ÷ 1.331 = **$90**.",
        "**Value everything after year 3 (the terminal value).** Say the cash grows 2% forever after that. TV = ($120 × 1.02) ÷ (10% − 2%) = $122.40 ÷ 0.08 = **$1,530**. But that's a year-3 number, so discount it too: $1,530 ÷ 1.331 = **$1,150**.",
        "**Add it all up.** $91 + $91 + $90 + $1,150 ≈ **$1,420**. That's what the stand is worth today.",
      ],
    },
    {
      type: "p",
      text: "Notice the terminal value is roughly 80% of the answer. That's normal for a DCF — and exactly why interviewers poke at your growing-forever assumption first.",
    },
  ],
  real: [
    {
      type: "p",
      text: "Target: a company doing **$500M revenue** at a **20% EBIT margin**, 25% tax rate, valued at a **10% WACC**. Build year-1 unlevered FCF, project five years, add a terminal value, then bridge to a share price.",
    },
    {
      type: "steps",
      items: [
        "**Year-1 unlevered FCF:** EBIT = $500M × 20% = $100M. NOPAT = $100M × (1 − 25%) = $75M. Add back D&A of $25M, subtract capex of $30M and a $5M working-capital build: $75M + $25M − $30M − $5M = **$65M**.",
        "**Project and discount years 1–5:** say UFCF grows to $65M, $70M, $75M, $80M, $85M. At 10%: 65 ÷ 1.10 + 70 ÷ 1.21 + 75 ÷ 1.331 + 80 ÷ 1.464 + 85 ÷ 1.611 ≈ 59 + 58 + 56 + 55 + 53 = **$281M**.",
        "**Terminal value (Gordon growth):** TV = $85M × 1.025 ÷ (10% − 2.5%) = $87.1M ÷ 0.075 = **$1,162M**. Discount from year 5: $1,162M ÷ 1.611 = **$721M**.",
        "**Enterprise value and the bridge:** EV = $281M + $721M ≈ **$1.0B**. Subtract $200M of net debt → equity value of **$802M**; divide by 40M fully diluted shares → **≈$20 per share**.",
      ],
    },
    {
      type: "p",
      text: "Say the sanity checks out loud: terminal value is ~72% of EV (typical); implied EV/EBITDA on year-1 EBITDA of $125M is **~8.0x** (cross-check against comps); and you'd sensitize WACC and terminal growth ±0.5% before quoting a single number.",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Finance: EV vs equity value                                         */
/* ------------------------------------------------------------------ */

export const EV_EQUITY_EXAMPLE: WorkedExample = {
  simple: [
    {
      type: "p",
      text: "You're buying your cousin's taco truck business. She wants **$80** for her ownership stake. The business also carries a **$40 loan** on the truck and keeps **$10 of cash** in the register.",
    },
    {
      type: "steps",
      items: [
        "**Equity value = $80.** That's simply the price of her stake — what the owner walks away with.",
        "**Enterprise value = what the operation really costs you:** $80 to her + the $40 loan you now owe − the $10 of cash that comes with it = **$110**.",
        "**Run the bridge backwards:** if you'd valued the taco operation itself at $110, her stake is worth $110 − $40 + $10 = **$80**. Same bridge, either direction.",
      ],
    },
    {
      type: "p",
      text: "Now imagine the identical truck with a **$60 loan** instead. The operation didn't change, so EV is still $110 — but the equity is only $110 − $60 + $10 = **$60**. That's the whole point: enterprise value is capital-structure-neutral; equity value isn't.",
    },
  ],
  real: [
    {
      type: "steps",
      items: [
        "**Equity value:** share price of $50 × 100M fully diluted shares (in-the-money options via the treasury stock method, plus RSUs and converts) = **$5.0B**.",
        "**Bridge to enterprise value:** $5.0B + total debt of $1.2B + preferred stock of $0.3B + noncontrolling interests of $0.1B − cash of $0.6B = **$6.0B**.",
        "**Pair multiples consistently:** LTM EBITDA of $600M → EV/EBITDA = $6,000M ÷ $600M = **10.0x**. Net income of $250M → P/E = $5,000M ÷ $250M = **20.0x**.",
      ],
    },
    {
      type: "p",
      text: "The classic trap is the mismatch: EV ÷ net income (or equity value ÷ EBITDA) mixes money that belongs to all capital providers with money that belongs only to shareholders. Also worth volunteering: EV can be **negative** for a cash-rich company — equity value can't go below zero.",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Finance: LBO                                                        */
/* ------------------------------------------------------------------ */

export const LBO_EXAMPLE: WorkedExample = {
  simple: [
    {
      type: "p",
      text: "An LBO is buying a rental condo with a mortgage — same math, smaller numbers.",
    },
    {
      type: "steps",
      items: [
        "**Buy:** the condo costs **$100**. You put down **$25** of your own cash and borrow **$75**.",
        "**Hold:** the tenant's rent covers the expenses and pays the mortgage down from $75 to **$50** over five years. None of that repayment was your money.",
        "**Sell at the same $100:** repay the $50 still owed and pocket $100 − $50 = **$50**. You turned $25 into $50 — **2.0x your money** — and the condo never went up in price.",
      ],
    },
    {
      type: "p",
      text: "If the condo instead sells for $120, you pocket $120 − $50 = **$70 → 2.8x**. The three PE return levers in condo terms: rent paying off the loan (**debt paydown**), making the condo nicer (**EBITDA growth**), and a hotter housing market (**multiple expansion**).",
    },
  ],
  real: [
    {
      type: "steps",
      items: [
        "**Entry:** buy at 8.0x on $100M of EBITDA → **$800M enterprise value**, funded 60/40: $480M of debt and a **$320M sponsor equity check**.",
        "**Hold five years:** EBITDA grows ~6% a year to **$134M**, and free cash flow repays **$250M** of debt, leaving $230M outstanding.",
        "**Exit at the same 8.0x:** 8.0 × $134M = **$1,072M EV** → exit equity = $1,072M − $230M = **$842M**.",
        "**Returns:** $842M ÷ $320M = **2.6x** money-on-money ≈ **21% IRR** over five years — clears a typical 20% hurdle.",
      ],
    },
    {
      type: "p",
      text: "Decompose the $522M equity gain and it ties out exactly: **$250M** from debt paydown + **$272M** from EBITDA growth at a constant multiple ($34M × 8.0x) + **$0** from multiple expansion. Attributing returns to the three levers like that is what separates a memorized answer from a real one.",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Consulting: market sizing                                           */
/* ------------------------------------------------------------------ */

export const SIZING_EXAMPLE: WorkedExample = {
  simple: [
    {
      type: "p",
      text: "Question: **how big is the sneaker-resale market at your high school, per year?**",
    },
    {
      type: "steps",
      items: [
        "**Start with people:** the school has **1,000 students**.",
        "**Filter to actual buyers:** maybe 1 in 10 buys resale pairs → **100 students**.",
        "**Frequency:** call it **2 pairs a year** each → 100 × 2 = **200 pairs**.",
        "**Price:** an average resale pair runs ≈ **$250** → 200 × $250 = **$50,000 a year**.",
      ],
    },
    {
      type: "p",
      text: "**Sanity check:** $50,000 ÷ 1,000 students = $50 per student per year — believable. That's the whole method: population → filters → frequency → price → does the answer smell right.",
    },
  ],
  real: [
    {
      type: "p",
      text: "Question: **size the US replacement market for car tires, in dollars per year.** Clarify first: replacement only (tires on new cars are OEM sales), passenger vehicles, annual dollars.",
    },
    {
      type: "steps",
      items: [
        "**Vehicles:** ~330M Americans at roughly 0.85 vehicles per person → call it **280M vehicles on the road**.",
        "**Replacement cycle:** a set of tires lasts about 4 years → 280M ÷ 4 = **70M vehicles replacing per year**.",
        "**Units:** 70M vehicles × 4 tires = **280M tires a year**.",
        "**Price:** an average replacement tire is ≈ **$150 installed** → 280M × $150 = **$42B per year**.",
      ],
    },
    {
      type: "p",
      text: "Close like a consultant: name the exclusions (commercial fleets and trucks would add more), offer the bottom-up cross-check (tire shops × sets sold per day), and give a range — **$40–50B**. The real figure lands right in that zone.",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Consulting: profitability                                           */
/* ------------------------------------------------------------------ */

export const PROFIT_EXAMPLE: WorkedExample = {
  simple: [
    {
      type: "p",
      text: "Your taco truck's profit dropped and you want to know why. Profit = revenue − costs, so split both sides and compare.",
    },
    {
      type: "steps",
      items: [
        "**Before:** 200 tacos a day at $8 = **$1,600 revenue**. Costs: $3 of ingredients per taco (200 × $3 = $600) plus $300 a day fixed (truck payment, permit). Profit = 1,600 − 600 − 300 = **$700/day**.",
        "**Now:** only 150 tacos a day. Revenue = 150 × $8 = $1,200; variable costs = 150 × $3 = $450; fixed still $300. Profit = 1,200 − 450 − 300 = **$450/day**.",
        "**Diagnose:** price didn't change, cost per taco didn't change — volume fell 25%. It's a **volume problem**, so ask why. Turns out a new taco truck parked two blocks over.",
      ],
    },
    {
      type: "p",
      text: "Match the fix to the cause: win customers back (menu, loyalty card, better spot) — not slashing the price, which just shrinks the $5 of margin you make on every taco you still sell.",
    },
  ],
  real: [
    {
      type: "p",
      text: "Client: a specialty retailer whose EBIT fell from **$60M to $40M**. Decompose the drop before prescribing anything.",
    },
    {
      type: "steps",
      items: [
        "**Baseline year:** revenue $500M × 40% gross margin = $200M gross profit − $140M SG&A = **$60M EBIT**.",
        "**This year:** revenue $480M (−4%) × 37.5% gross margin = $180M gross profit − $140M SG&A = **$40M EBIT**.",
        "**Attribute the $20M:** lost volume cost ($500M − $480M) × 40% = **$8M**; margin compression cost $480M × (40% − 37.5%) = **$12M**. $8M + $12M = $20M — it ties out.",
        "**Drill on the bigger driver:** the 250bps of gross margin. Promo depth? Freight and input costs? Mix shift toward lower-margin categories? Each has a completely different fix.",
      ],
    },
    {
      type: "p",
      text: "Then quantify the recommendation: recovering 150bps of margin ≈ $480M × 1.5% = **$7.2M of EBIT** — more impact than most volume plays, and faster.",
    },
  ],
};
