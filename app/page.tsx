"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SPLASH_DURATION_MS = 3000;

// Tela de abertura do app: mostra a logo por alguns segundos e segue pro
// login, sempre — igual a tela de lançamento de qualquer app nativo,
// sem lógica de "já vi antes" pra pular.
export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login");
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <img
        src="/logo-icon.png"
        alt="StudioMaker"
        className="h-24 w-24 animate-splash-logo opacity-0"
      />
    </div>
  );
}
