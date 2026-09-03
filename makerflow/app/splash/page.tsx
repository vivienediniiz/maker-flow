"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_SPLASH_MS = 1200;
const LOGOUT_SPLASH_MS = 800;

// Tela de abertura do app: mostra a logo por alguns segundos e segue pro
// destino certo — igual a tela de lançamento de qualquer app nativo.
//
// Mora em /splash e não na raiz: a raiz é a landing (app/page.tsx), a porta
// de entrada de quem ainda não conhece o produto. São três as entradas
// daqui, todas de dentro do app: `app` (start_url do PWA instalado, checa
// sessão e vai pro dashboard ou login), `logo` (clique na logo em qualquer
// tela, mesma checagem, serve pra "atualizar" o app) e `logout` (botão
// "Sair" no Topbar, sempre vai pro login).
function SplashContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const isLogout = from === "logout";
  const isShortSplash = isLogout || from === "logo";
  const duration = isShortSplash ? LOGOUT_SPLASH_MS : DEFAULT_SPLASH_MS;

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
