import { Sidebar } from "@/components/dashboard/Sidebar";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { PixRenewalBanner } from "@/components/dashboard/PixRenewalBanner";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { trialDaysRemaining } from "@/lib/trial";
import { pixBillingState } from "@/lib/pix";
import type { SubscriptionTier, BillingCycle } from "@/lib/types";

async function getCurrentProfile() {
  const supabase = createClient();
  const user = await getCurrentUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, subscription_tier, billing_cycle, trial_ends_at, payment_method, paid_until")
    .eq("id", user.id)
    .single();

  if (profile && profile.payment_method === "pix" && pixBillingState(profile.paid_until) === "expired") {
    await supabase
      .from("profiles")
      .update({ subscription_tier: "free", subscription_status: "inactive", payment_method: null, paid_until: null })
      .eq("id", user.id);

    profile.subscription_tier = "free";
    profile.payment_method = null;
    profile.paid_until = null;
  }

  return profile;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  const tier = (profile?.subscription_tier ?? "free") as SubscriptionTier;
  const cycle = (profile?.billing_cycle ?? null) as BillingCycle | null;
  const daysRemaining = trialDaysRemaining(profile?.trial_ends_at);
  const isPix = profile?.payment_method === "pix";
  const pixState = isPix ? pixBillingState(profile?.paid_until) : null;

  return (
    <div className="min-h-screen">
      <Sidebar studioName={profile?.full_name} avatarUrl={profile?.avatar_url} tier={tier} cycle={cycle} />
      <div className="md:pl-72">
        {isPix && pixState === "grace" ? (
          <PixRenewalBanner paidUntil={profile!.paid_until} />
        ) : (
          <TrialBanner tier={tier} daysRemaining={daysRemaining} />
        )}
        {children}
      </div>
    </div>
  );
}