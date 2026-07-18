"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CalendarDays,
  FileText,
  GraduationCap,
  Map,
  Sparkles,
  Dumbbell,
  BookOpenText,
  MessageSquareText,
  MessagesSquare,
  MessageCircleQuestion,
  CircleUserRound,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/components/ui";
import { normalizeTier, TIER_INFO } from "@/lib/tiers";
import { signout } from "@/lib/actions/auth";

const NAV_SECTIONS: {
  heading?: string;
  items: { href: string; label: string; icon: React.ElementType }[];
}[] = [
  {
    items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }],
  },
  {
    heading: "Keep tabs",
    items: [
      { href: "/dashboard/contacts", label: "Contacts", icon: Users },
      { href: "/dashboard/applications", label: "Applications", icon: Briefcase },
      { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/dashboard/opportunities", label: "Opportunities", icon: Sparkles },
    ],
  },
  {
    heading: "Fundamentals",
    items: [
      { href: "/dashboard/plan", label: "My Plan", icon: Map },
      { href: "/dashboard/documents", label: "Documents", icon: FileText },
      { href: "/dashboard/experience", label: "Experience", icon: GraduationCap },
      { href: "/dashboard/stories", label: "Story Bank", icon: MessageSquareText },
      { href: "/dashboard/practice", label: "Practice", icon: Dumbbell },
      { href: "/dashboard/resources", label: "Resources", icon: BookOpenText },
    ],
  },
  {
    heading: "More",
    items: [
      { href: "/dashboard/chat", label: "AI Chat", icon: MessagesSquare },
      { href: "/dashboard/faq", label: "Recruiting FAQ", icon: MessageCircleQuestion },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
      { href: "/dashboard/account", label: "Account", icon: CircleUserRound },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
      {NAV_SECTIONS.map((section, i) => (
        <div key={i}>
          {section.heading && (
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-brand-400">
              {section.heading}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-100 text-brand-800"
                        : "text-zinc-500 hover:bg-brand-50 hover:text-brand-700"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4",
                        active ? "text-brand-600" : "text-zinc-400"
                      )}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({
  name,
  email,
  avatarUrl,
  tier,
  isAdmin = false,
}: {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  tier: string | null;
  isAdmin?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const tierLabel = TIER_INFO[normalizeTier(tier)].label;

  const userBlock = (
    <div className="border-t border-brand-100 p-3">
      <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-200 text-sm font-semibold text-brand-800">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            (name || email || "?").charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-brand-900">
            {name || "Your account"}
          </p>
          <p className="flex items-center gap-1 truncate text-[11px] text-brand-400/90">
            {tierLabel}
            {isAdmin && (
              <span className="inline-flex items-center gap-0.5 font-medium text-amber-500">
                · <ShieldCheck className="h-3 w-3" /> Admin
              </span>
            )}
          </p>
          <p className="truncate text-xs text-zinc-400">{email}</p>
        </div>
        <form action={signout}>
          <button
            type="submit"
            title="Sign out"
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-500 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-brand-100 bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="text-lg font-bold text-brand-800">
          me2<span className="text-brand-500">IB</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-brand-700 hover:bg-brand-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-brand-900/25 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-lg font-bold text-brand-800">
                me2<span className="text-brand-500">IB</span>
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-brand-50"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            {userBlock}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-brand-100 bg-white/70 backdrop-blur lg:flex">
        <div className="px-6 py-5">
          <Link href="/dashboard" className="text-xl font-bold text-brand-800">
            me2<span className="text-brand-500">IB</span>
          </Link>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            track the chaos
          </p>
        </div>
        <NavLinks />
        {userBlock}
      </aside>
    </>
  );
}
