import Link from "next/link";
import {
  Users,
  Briefcase,
  CalendarDays,
  FileText,
  Map,
  Sparkles,
  MessageCircleQuestion,
  BookOpenText,
  ArrowRight,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

const FEATURES = [
  {
    icon: Users,
    title: "Contacts that never go cold",
    body: "Track who you know, how you met, and how strong the connection is. me2IB nudges you before a contact slips away.",
  },
  {
    icon: Briefcase,
    title: "Application tracker built for recruiting",
    body: "Finance, consulting, marketing, ops and more — organized by industry, tier, and sector, with deadlines, materials, and interview progress in one place.",
  },
  {
    icon: CalendarDays,
    title: "A calendar with a brain",
    body: "Coffee chats, interviews, deadlines — plus smart suggestions like “follow up with Sarah, it's been 3 weeks.”",
  },
  {
    icon: FileText,
    title: "Docs with honest feedback",
    body: "Store resumes and cover letters, then get AI feedback — the supportive kind and the critical kind — tuned to your target industry.",
  },
  {
    icon: Map,
    title: "A plan, not a panic",
    body: "Punch in your school and grad date. Get a personalized recruiting roadmap: when to network, when to apply, and how to convert chats into referrals.",
  },
  {
    icon: Sparkles,
    title: "Opportunities & next steps",
    body: "Scan for openings in your target industries, add them to your tracker in one click, and get suggested outreach for each one.",
  },
  {
    icon: BookOpenText,
    title: "Prep, stories & resources",
    body: "A story bank for behavioral answers, technical prep by industry, and the guides everyone whispers about (WSO, BIWS & friends).",
  },
  {
    icon: MessageCircleQuestion,
    title: "Recruitment, demystified",
    body: "A plain-English FAQ on what recruiting actually is, why it starts absurdly early, and what all the acronyms mean.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Nav */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-bold tracking-tight text-brand-800">
          me2<span className="text-brand-500">IB</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/faq"
            className="rounded-xl px-3 py-2 font-medium text-brand-800 hover:bg-brand-100"
          >
            FAQ
          </Link>
          <Link
            href="/login"
            className="rounded-xl px-3 py-2 font-medium text-brand-800 hover:bg-brand-100"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-brand-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-14 text-center sm:pt-20">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-xs font-medium text-brand-700">
          <Sparkles className="h-3.5 w-3.5" />
          From “what is recruiting?” to signed offer
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight text-brand-900 sm:text-5xl">
          Your entire recruiting life,
          <br />
          in one cozy hub.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-zinc-500">
          me2IB keeps your contacts warm, your applications organized, your
          deadlines visible, and your plan clear — for finance, consulting, and
          every other path into business.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-medium text-white shadow-md transition-all hover:bg-brand-700 hover:shadow-lg"
          >
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white/70 px-6 py-3 font-medium text-brand-800 transition-colors hover:bg-brand-50"
          >
            What even is recruiting?
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-brand-100 bg-white/85 p-5 card-shadow transition-transform hover:-translate-y-0.5"
            >
              <div className="mb-3 inline-flex rounded-xl bg-brand-100 p-2.5 text-brand-600">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-brand-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
