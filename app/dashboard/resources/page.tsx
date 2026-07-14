import type { Metadata } from "next";
import {
  ExternalLink,
  GraduationCap,
  Handshake,
  Lightbulb,
  Newspaper,
  Rocket,
} from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Resources" };

/* ------------------------------------------------------------------ */
/* Data (static — curated, no DB)                                      */
/* ------------------------------------------------------------------ */

type LinkResource = {
  kind: "link";
  name: string;
  tag: string;
  description: string;
  href: string;
};

type NoteResource = {
  kind: "note";
  name: string;
  description: string;
};

type Resource = LinkResource | NoteResource;

type Section = {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Resource[];
};

const SECTIONS: Section[] = [
  {
    title: "Guides & prep courses",
    subtitle: "Technicals, cases, and the classic references everyone quotes.",
    icon: GraduationCap,
    items: [
      {
        kind: "link",
        name: "Wall Street Oasis",
        tag: "Forum + guides",
        description:
          "The biggest finance forum — recruiting threads, firm reviews, and comp data. Take the cynicism with a grain of salt.",
        href: "https://www.wallstreetoasis.com",
      },
      {
        kind: "link",
        name: "Breaking Into Wall Street (BIWS)",
        tag: "Paid course",
        description:
          "Paid video courses on financial modeling and valuation. Overkill for behaviorals, excellent for technicals.",
        href: "https://breakingintowallstreet.com",
      },
      {
        kind: "link",
        name: "Wall Street Prep",
        tag: "Paid course",
        description:
          "The other big modeling course — banks literally use it to train their own new analysts.",
        href: "https://www.wallstreetprep.com",
      },
      {
        kind: "link",
        name: "Mergers & Inquisitions",
        tag: "Free articles",
        description:
          "Free, brutally practical articles on every stage of IB recruiting, from the BIWS founder.",
        href: "https://mergersandinquisitions.com",
      },
      {
        kind: "link",
        name: "400 IB Interview Questions",
        tag: "Question bank",
        description:
          "WSO's classic technical question bank. If you can answer these cold, you're ready for most first rounds.",
        href: "https://www.wallstreetoasis.com/resources/interviews/investment-banking-interview-questions",
      },
      {
        kind: "link",
        name: "Rosenbaum & Pearl — Investment Banking",
        tag: "Book",
        description:
          "The valuation textbook (DCF, comps, LBOs, M&A). Dense but definitive — read it once, then keep it as a reference.",
        href: "https://www.wiley.com/en-us/Investment+Banking%3A+Valuation%2C+LBOs%2C+M%26A%2C+and+IPOs%2C+3rd+Edition-p-9781119706182",
      },
      {
        kind: "link",
        name: "Management Consulted",
        tag: "Consulting",
        description:
          "Consulting-focused prep: case libraries, firm guides, and interview coaching.",
        href: "https://managementconsulted.com",
      },
      {
        kind: "link",
        name: "Case in Point",
        tag: "Book",
        description:
          "Cosentino's case-prep classic. Learn the frameworks — then practice enough that you stop sounding like them.",
        href: "https://www.casequestions.com",
      },
      {
        kind: "link",
        name: "PrepLounge",
        tag: "Practice partners",
        description:
          "Match with live case-practice partners. Cases are a contact sport — you can't just read about them.",
        href: "https://www.preplounge.com",
      },
      {
        kind: "link",
        name: "Victor Cheng — CaseInterview.com",
        tag: "Free videos",
        description:
          "Free videos and the LOMS program — the clearest explanation of how interviewers actually grade cases.",
        href: "https://www.caseinterview.com",
      },
    ],
  },
  {
    title: "Networking",
    subtitle: "Finding people, reaching them, and knowing what to say.",
    icon: Handshake,
    items: [
      {
        kind: "link",
        name: "LinkedIn",
        tag: "Essential",
        description:
          "Where all of this happens. Polish your headline, then search \"[your school] + [firm]\" and start connecting.",
        href: "https://www.linkedin.com",
      },
      {
        kind: "note",
        name: "Your school's alumni database",
        description:
          "The single warmest source of contacts you have — alumni reply at many times the rate of cold outreach. Ask your career center where it lives.",
      },
      {
        kind: "link",
        name: "Hunter.io",
        tag: "Email finder",
        description:
          "Find a firm's email format (first.last@bank.com) so your cold emails actually land in an inbox.",
        href: "https://hunter.io",
      },
      {
        kind: "note",
        name: "Coffee-chat question bank",
        description:
          "Keep 5 go-to questions ready: their path, their group, a recent deal, advice for someone like you, and \"who else should I talk to?\"",
      },
    ],
  },
  {
    title: "News & market sense",
    subtitle: "Enough market awareness to hold a conversation — not a second major.",
    icon: Newspaper,
    items: [
      {
        kind: "link",
        name: "Wall Street Journal",
        tag: "News",
        description:
          "The default read for markets and deals. Most schools give students free access — check before paying.",
        href: "https://www.wsj.com",
      },
      {
        kind: "link",
        name: "Financial Times",
        tag: "News",
        description:
          "More global and markets-heavy than the WSJ. Great for macro talking points.",
        href: "https://www.ft.com",
      },
      {
        kind: "link",
        name: "Bloomberg",
        tag: "News",
        description:
          "Real-time markets coverage — good for the morning skim before an interview or coffee chat.",
        href: "https://www.bloomberg.com",
      },
      {
        kind: "link",
        name: "Matt Levine's Money Stuff",
        tag: "Newsletter",
        description:
          "Free daily newsletter, and the single most enjoyable way to understand how finance actually works.",
        href: "https://www.bloomberg.com/account/newsletters/money-stuff",
      },
      {
        kind: "link",
        name: "Axios Pro Rata",
        tag: "Newsletter",
        description:
          "Short free daily email on deals, PE, and VC — M&A talking points in five minutes.",
        href: "https://www.axios.com/newsletters/axios-pro-rata",
      },
      {
        kind: "note",
        name: "Read 15 minutes a day",
        description:
          "You don't need to know everything — you just need 2–3 talking points you can go deep on. Consistency beats cramming the night before.",
      },
    ],
  },
  {
    title: "Free experience",
    subtitle: "Resume lines you can earn from your dorm room.",
    icon: Rocket,
    items: [
      {
        kind: "link",
        name: "Forage",
        tag: "Virtual internships",
        description:
          "Free virtual job simulations from real banks and consultancies. Not prestigious, but a legit resume line and a taste of the actual work.",
        href: "https://www.theforage.com",
      },
      {
        kind: "note",
        name: "Case competitions",
        description:
          "National-level case competitions (often free to enter) are the fastest way to earn \"analyzed a company\" bullets early on. Start with your school's business clubs.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function ResourceLinkCard({ item }: { item: LinkResource }) {
  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full"
    >
      <Card className="h-full p-4 transition-all group-hover:-translate-y-0.5 group-hover:border-brand-300">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-brand-900 group-hover:text-brand-700">
            {item.name}
          </p>
          <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-brand-300 transition-colors group-hover:text-brand-500" />
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
          {item.description}
        </p>
        <div className="mt-3">
          <Badge className="bg-brand-50 text-brand-600">{item.tag}</Badge>
        </div>
      </Card>
    </a>
  );
}

function ResourceNoteCard({ item }: { item: NoteResource }) {
  return (
    <Card className="h-full border-dashed bg-brand-50/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-brand-900">{item.name}</p>
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-brand-900/70">
        {item.description}
      </p>
      <div className="mt-3">
        <Badge className="bg-brand-100 text-brand-700">Tip</Badge>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ResourcesPage() {
  return (
    <div>
      <PageHeader
        title="Resources"
        description="A curated shelf of the guides, tools, and reads that actually help — with honest notes on what each one is good for."
      />

      <div className="space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
                <section.icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-brand-900">
                  {section.title}
                </h2>
                <p className="text-sm text-zinc-500">{section.subtitle}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) =>
                item.kind === "link" ? (
                  <ResourceLinkCard key={item.name} item={item} />
                ) : (
                  <ResourceNoteCard key={item.name} item={item} />
                )
              )}
            </div>
          </section>
        ))}

        {/* Closing tip */}
        <Card className="flex flex-col items-center gap-2 border-dashed bg-brand-50/60 p-8 text-center">
          <Lightbulb className="h-8 w-8 text-brand-400" />
          <p className="font-medium text-brand-900">
            You don&apos;t need all of these.
          </p>
          <p className="max-w-md text-sm leading-relaxed text-brand-900/70">
            Pick one guide per category and actually finish it. Depth beats
            breadth in every interview.
          </p>
        </Card>
      </div>
    </div>
  );
}
