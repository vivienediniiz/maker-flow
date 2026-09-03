"use client";

import { createContext, useContext } from "react";
import { isPaid } from "@/lib/entitlements";
import type { SubscriptionTier } from "@/lib/types";

interface SubscriptionContextValue {
  tier: SubscriptionTier;
  paid: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({ tier: "free", paid: false });

export function SubscriptionProvider({
  tier,
  children,
}: {
  tier: SubscriptionTier;
  children: React.ReactNode;
}) {
  return (
    <SubscriptionContext.Provider value={{ tier, paid: isPaid(tier) }}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
