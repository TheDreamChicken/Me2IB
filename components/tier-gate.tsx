"use client";

import Link from "next/link";
import { Check, Lock, Sparkles } from "lucide-react";
import { Badge, Button, Card, cn } from "@/components/ui";
import { useTier } from "@/components/tier-context";
import {
  hasFeature,
  requiredTier,
  TIER_INFO,
  type GatedFeature,
} from "@/lib/tiers";

/**
 * Gates children behind a subscription tier.
 * - variant="page": full-page cover explaining the locked section + tiers.
 * - variant="card": compact inline cover for a single locked feature card.
 */
export function TierGate({
  feature,
  title,
  blurb,
  perks,
  variant = "card",
  children,
}: {
  feature: GatedFeature;
  /** What is locked, e.g. "The Practice section" or "AI resume review". */
  title: string;
  /** One sentence on what the locked thing does. */
  blurb: string;
  /** Optional bullets describing what's inside the locked feature. */
  perks?: string[];
  variant?: "page" | "card";
  children: React.ReactNode;
}) {
  const tier = useTier();
  if (hasFeature(tier, feature)) return <>{children}</>;

  const needed = requiredTier(feature);
  const info = TIER_INFO[needed];

  if (variant === "card") {
    return (
      <Card className="border-dashed border-brand-200 bg-brand-50/60 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-brand-100 p-2 text-brand-500">
            <Lock className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-brand-900">{title}</p>
              <Badge className={info.badgeClass}>
                {info.label} · {info.price}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{blurb}</p>
            <Link href="/dashboard/account#plans" className="mt-3 inline-block">
              <Button size="sm" variant="secondary">
                <Sparkles className="h-3.5 w-3.5" />
                Unlock with {info.label}
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-100/80 via-brand-50 to-white px-8 pb-6 pt-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-500 card-shadow">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-brand-900">
            {title} is a {info.label} feature
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">{blurb}</p>
        </div>
        <div className="px-8 pb-8">
          {perks && perks.length > 0 && (
            <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">
                What&apos;s inside
              </p>
              <ul className="mt-2 space-y-1.5">
                {perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-start gap-2 text-sm text-brand-900/80"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div
            className={cn(
              "mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 p-4"
            )}
          >
            <div>
              <div className="flex items-center gap-2">
                <Badge className={info.badgeClass}>{info.label}</Badge>
                <span className="text-lg font-semibold text-brand-900">
                  {info.price}
                </span>
                <span className="text-xs text-zinc-400">{info.priceNote}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{info.tagline}</p>
            </div>
            <Link href="/dashboard/account#plans">
              <Button>
                <Sparkles className="h-4 w-4" />
                See plans & upgrade
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-center text-xs text-zinc-400">
            Have an access code? Redeem it in{" "}
            <Link
              href="/dashboard/account#plans"
              className="text-brand-500 underline-offset-2 hover:underline"
            >
              Account → Plan
            </Link>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}
