import { Sidebar } from "@/components/dashboard/Sidebar";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { PixRenewalBanner } from "@/components/dashboard/PixRenewalBanner";
import { SubscriptionProvider } from "@/components/dashboard/SubscriptionContext";
import { MobileSidebarProvider } from "@/components/dashboard/MobileSidebarContext";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { pixBillingState } from "@/lib/pix";
import type { SubscriptionTier, SubscriptionStatus } from "@/lib/types";

async function getCurrentProfile() {
  const supabase = createClient();
  const user = await getCurrentUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, avatar_url, subscription_tier, subscription_status, billing_cycle, trial_ends_at, payment_method, paid_until, is_admin"
    )
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  if (profile.payment_method === "pix" && pixBillingState(profile.paid_until) === "expired") {
    await supabase
      .from("profiles")
      .update({ subscription_tier: "free", subscription_status: "inactive", payment_method: null, paid_until: null })
      .eq("id", user.id);

    profile.subscription_tier = "free";
    profile.subscription_status = "inactive";
    profile.payment_method = null;
    profile.paid_until = null;
  }

  // Reverse trial: passou de trial_ends_at e nunca virou assinante de
  // verdade (subscription_status != "active") → cai pra Free automaticamente.
  // Mesmo padrão lazy-check do Pix acima, só que pro fim do período de teste.
  const trialExpired = new Date(profile.trial_ends_at).getTime() < Date.now();
  if (trialExpired && profile.subscription_status !== "active" && profile.subscription_tier !== "free") {
    await supabase
      .from("profiles")
      .update({ subscription_tier: "free" })
      .eq("id", user.id);

    profile.subscription_tier = "free";
  }

  return profile;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  const tier = (profile?.subscription_tier ?? "free") as SubscriptionTier;
  const subscriptionStatus = (profile?.subscription_status ?? "inactive") as SubscriptionStatus;
  const isPix = profile?.payment_method === "pix";
  const pixState = isPix ? pixBillingState(profile?.paid_until) : null;

  return (
    <SubscriptionProvider tier={tier}>
      <MobileSidebarProvider>
        <div className="min-h-screen">
          <Sidebar
            studioName={profile?.full_name}
            avatarUrl={profile?.avatar_url}
            tier={tier}
            isAdmin={profile?.is_admin ?? false}
          />
          <div className="md:pl-72">
            {isPix && pixState === "grace" ? (
              <PixRenewalBanner paidUntil={profile!.paid_until} />
            ) : (
              <TrialBanner
                tier={tier}
                subscriptionStatus={subscriptionStatus}
                trialEndsAt={profile?.trial_ends_at ?? null}
              />
            )}
            {children}
          </div>
        </div>
      </MobileSidebarProvider>
    </SubscriptionProvider>
  );
}
