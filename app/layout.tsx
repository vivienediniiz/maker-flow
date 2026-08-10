import { Sidebar } from "@/components/dashboard/Sidebar";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { createClient } from "@/lib/supabase/server";
import { trialDaysRemaining } from "@/lib/trial";
import type { SubscriptionTier, BillingCycle } from "@/lib/types";

async function getCurrentProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, subscription_tier, billing_cycle, trial_ends_at")
    .eq("id", user.id)
    .single();

  return profile;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  const tier = (profile?.subscription_tier ?? "free") as SubscriptionTier;
  const cycle = (profile?.billing_cycle ?? null) as BillingCycle | null;
  const daysRemaining = trialDaysRemaining(profile?.trial_ends_at);

  return (
    <div className="min-h-screen">
      <Sidebar studioName={profile?.full_name} tier={tier} cycle={cycle} />
      <div className="md:pl-64">
        <TrialBanner tier={tier} daysRemaining={daysRemaining} />
        {children}
      </div>
    </div>
  );
}