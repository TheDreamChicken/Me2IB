import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircleQuestion } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { FaqView } from "./faq-view";

export const metadata: Metadata = { title: "Recruitment FAQ" };

export default function FaqPage() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Nav — consistent with the landing page */}
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
            Sign up
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-10 pt-12 text-center sm:pt-16">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-xs font-medium text-brand-700">
          <MessageCircleQuestion className="h-3.5 w-3.5" />
          No question is too basic
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-brand-900 sm:text-5xl">
          Recruiting, demystified
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-zinc-500">
          The stuff everyone assumes you already know — timelines, tiers, coffee
          chats, and a pile of acronyms — explained the way an older student
          would over lunch. Honesty about the grind included.
        </p>
      </section>

      {/* Accordions */}
      <FaqView />

      {/* CTA */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-20">
        <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-100 via-brand-50 to-white p-8 text-center card-shadow">
          <h2 className="text-xl font-semibold text-brand-900">
            Ready to get organized?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
            Reading about recruiting is step one. Tracking the contacts,
            applications, and deadlines is the rest — me2IB keeps all of it in
            one place, for free.
          </p>
          <Link
            href="/signup"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-medium text-white shadow-md transition-all hover:bg-brand-700 hover:shadow-lg"
          >
            Sign up <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
