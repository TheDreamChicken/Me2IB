"use client";

import { createContext, useContext } from "react";
import { normalizeTier, type TierId } from "@/lib/tiers";

const TierContext = createContext<TierId>("free");

/** Wraps the dashboard so any client component can read the user's tier. */
export function TierProvider({
  tier,
  children,
}: {
  tier: string | null | undefined;
  children: React.ReactNode;
}) {
  return (
    <TierContext.Provider value={normalizeTier(tier)}>
      {children}
    </TierContext.Provider>
  );
}

export function useTier(): TierId {
  return useContext(TierContext);
}
