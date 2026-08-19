"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_SPLASH_MS = 3000;
const LOGOUT_SPLASH_MS = 2000;

// Tela de abertura do app: mostra a logo por alguns segundos e segue pro
// destino certo — igual a tela de lançamento de qualquer app nativo.
// Passa por aqui em dois casos: abertura normal (checa sessão e manda pro
// dashboard se já estiver logado, senão pro login) e logout (`?from=logout`,
// disparado pelo botão "Sair" no Topbar), que sempre vai pro login e usa uma
// duração mais curta.
function SplashContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLogout = searchParams.get("from") === "logout";
  const duration = isLogout ? LOGOUT_SPLASH_MS : DEFAULT_SPLASH_MS;

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (isLogout) {
        router.replace("/login");
        return;
      }
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      router.replace(session ? "/dashboard" : "/login");
    }, duration);
    return () => clearTimeout(timer);
  }, [router, isLogout, duration]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <img
        src="/logo-icon.png"
        alt="StudioMaker"
        className="h-24 w-24 animate-splash-logo opacity-0"
        style={{ animationDuration: `${duration}ms` }}
      />
    </div>
  );
}

export default function SplashPage() {
  return (
    <Suspense fallback={null}>
      <SplashContent />
    </Suspense>
  );
}
