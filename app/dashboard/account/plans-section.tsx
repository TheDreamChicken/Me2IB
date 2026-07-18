"use client";

import { useState, useTransition } from "react";
import { Check, CheckCircle2, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { changeTier, redeemAccessCode } from "@/lib/actions/profile";
import { TIER_INFO, TIER_ORDER, type TierId } from "@/lib/tiers";
import { Badge, Button, Card, cn, Input, Modal, Spinner } from "@/components/ui";

/**
 * The full-width "Plans" section. TierGate CTAs across the app deep-link to
 * /dashboard/account#plans, so keep the section id stable.
 */
export function PlansSection({
  currentTier,
  isAdmin = false,
}: {
  currentTier: TierId;
  isAdmin?: boolean;
}) {
  const [target, setTarget] = useState<TierId | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planPending, startPlanTransition] = useTransition();
  // Admin instant switching: which tier button is mid-flight.
  const [switching, setSwitching] = useState<TierId | null>(null);

  const [code, setCode] = useState("");
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemedLabel, setRedeemedLabel] = useState<string | null>(null);
  const [redeemPending, startRedeemTransition] = useTransition();

  const targetInfo = target ? TIER_INFO[target] : null;
  const targetIsUpgrade =
    target !== null &&
    TIER_ORDER.indexOf(target) > TIER_ORDER.indexOf(currentTier);

  function closeModal() {
    if (planPending) return;
    setTarget(null);
    setPlanError(null);
  }

  function confirmChange() {
    if (!target) return;
    setPlanError(null);
    startPlanTransition(async () => {
      const res = await changeTier(target);
      if (res.error) setPlanError(res.error);
      // Success: revalidation refreshes the page + sidebar with the new tier.
      else setTarget(null);
    });
  }

  // Admins hop between tiers with one click — no demo-checkout modal.
  function adminSwitch(id: TierId) {
    setPlanError(null);
    setSwitching(id);
    startPlanTransition(async () => {
      const res = await changeTier(id);
      if (res.error) setPlanError(res.error);
      setSwitching(null);
    });
  }

  function redeem() {
    setRedeemError(null);
    setRedeemedLabel(null);
    startRedeemTransition(async () => {
      const res = await redeemAccessCode(code);
      if (res.error) {
        setRedeemError(res.error);
      } else {
        setRedeemedLabel(res.tierLabel ?? null);
        setCode("");
      }
    });
  }

  return (
    <section id="plans" className="mt-8 scroll-mt-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-brand-900">Plans</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Pay for the heat you need — switch up or down whenever.
        </p>
        {isAdmin && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin: switching is instant
            for you — hop between tiers to experience each one.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TIER_ORDER.map((id) => {
          const info = TIER_INFO[id];
          const isCurrent = id === currentTier;
          const isUpgrade =
            TIER_ORDER.indexOf(id) > TIER_ORDER.indexOf(currentTier);
          return (
            <Card
              key={id}
              className={cn(
                "flex flex-col p-5 sm:p-6",
                isCurrent && "ring-2 ring-brand-400"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-brand-900">{info.label}</h3>
                {isCurrent && (
                  <Badge className={info.badgeClass}>Current plan</Badge>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold text-brand-900">
                  {info.price}
                </span>
                <span className="text-xs text-zinc-400">{info.priceNote}</span>
              </div>
              <p className="mt-1.5 text-sm text-zinc-500">{info.tagline}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {info.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-brand-900/80"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled
                    className="w-full"
                  >
                    Current plan
                  </Button>
                ) : isAdmin ? (
                  <Button
                    type="button"
                    variant={isUpgrade ? "primary" : "secondary"}
                    className="w-full"
                    disabled={planPending}
                    onClick={() => adminSwitch(id)}
                  >
                    {switching === id ? (
                      <Spinner />
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" /> Switch to{" "}
                        {info.label}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant={isUpgrade ? "primary" : "secondary"}
                    className="w-full"
                    onClick={() => {
                      setPlanError(null);
                      setTarget(id);
                    }}
                  >
                    {isUpgrade ? (
                      <>
                        <Sparkles className="h-4 w-4" /> Get {info.label}
                      </>
                    ) : (
                      "Switch down"
                    )}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {planError && target === null && (
        <p className="mt-3 text-sm text-rose-600">{planError}</p>
      )}

      {/* ------------------------- Access code ------------------------- */}
      <Card className="mt-4 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-brand-900">
                Have an access code?
              </h3>
              <p className="text-xs text-zinc-500">
                Codes skip checkout entirely — redeem one and you&apos;re in.
              </p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              redeem();
            }}
            className="flex w-full items-center gap-2 sm:w-auto"
          >
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Your code"
              aria-label="Access code"
              className="flex-1 sm:w-48"
            />
            <Button type="submit" disabled={redeemPending || !code.trim()}>
              {redeemPending ? <Spinner /> : "Redeem"}
            </Button>
          </form>
        </div>
        {redeemError && (
          <p className="mt-3 text-sm text-rose-600">{redeemError}</p>
        )}
        {redeemedLabel && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Welcome to {redeemedLabel}!
          </p>
        )}
      </Card>

      {/* --------------------- Confirm switch modal --------------------- */}
      <Modal
        open={target !== null}
        onClose={closeModal}
        title={
          targetInfo
            ? targetIsUpgrade
              ? `Get ${targetInfo.label}`
              : `Switch to ${targetInfo.label}`
            : undefined
        }
      >
        {targetInfo && (
          <div>
            <p className="text-sm leading-relaxed text-zinc-600">
              Quick honesty check: real payments aren&apos;t hooked up yet, so
              there&apos;s no card form behind this button. Confirming switches
              your plan to{" "}
              <span className="font-medium text-brand-900">
                {targetInfo.label}
              </span>{" "}
              ({targetInfo.price}, {targetInfo.priceNote}) instantly, on the
              house — Stripe checkout takes over this step later.
            </p>
            {!targetIsUpgrade && (
              <p className="mt-3 text-sm text-zinc-500">
                Heads up: anything gated above {targetInfo.label} locks again
                the moment you switch.
              </p>
            )}
            {planError && (
              <p className="mt-3 text-sm text-rose-600">{planError}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={closeModal}
                disabled={planPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmChange}
                disabled={planPending}
              >
                {planPending ? <Spinner /> : `Switch to ${targetInfo.label}`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
