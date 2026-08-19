"use client";

import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type OAuthProvider = "google";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039 l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

const PROVIDERS: { id: OAuthProvider; label: string; icon: ReactNode }[] = [
  { id: "google", label: "Continuar com Google", icon: <GoogleIcon /> },
];

export function SocialAuthButtons({ refCode }: { refCode?: string } = {}) {
  const supabase = createClient();
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(provider: OAuthProvider) {
    setError(null);
    setLoadingProvider(provider);

    // `ref` viaja junto no redirectTo pro callback conseguir resolver a
    // indicação depois do round-trip pelo provedor OAuth (sessionStorage não
    // é confiável aqui pq alguns provedores abrem em nova aba/popup).
    const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
    if (refCode) callbackUrl.searchParams.set("ref", refCode);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl.toString() },
    });

    if (error) {
      setError(error.message);
      setLoadingProvider(null);
    }
  }

  return (
    <div className="space-y-2">
      {PROVIDERS.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => handleClick(provider.id)}
          disabled={loadingProvider !== null}
          className={cn(
            "flex w-full items-center justify-center gap-2.5 rounded-pill border border-border-glassStrong",
            "bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-text-primary",
            "transition-colors hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          {provider.icon}
          {loadingProvider === provider.id ? "Redirecionando..." : provider.label}
        </button>
      ))}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
