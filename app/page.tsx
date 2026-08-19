"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Guarda no navegador que a intro já foi vista — evita reproduzir o vídeo de
// novo a cada visita (ex: alguém clicando "logo" pra voltar à home a partir
// de outra página); depois da primeira vez, "/" vai direto pro login.
const INTRO_SEEN_KEY = "studiomaker_intro_seen";

export default function IntroPage() {
  const router = useRouter();
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(INTRO_SEEN_KEY)) {
      router.replace("/login");
      return;
    }
    setShowVideo(true);
  }, [router]);

  function goToLogin() {
    localStorage.setItem(INTRO_SEEN_KEY, "1");
    router.replace("/login");
  }

  // Enquanto decide (viu antes? redireciona; não viu? mostra vídeo), fica em
  // branco — evita o vídeo "piscar" pra quem já passou pela intro.
  if (!showVideo) return null;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src="/intro.mp4"
        autoPlay
        muted
        playsInline
        onEnded={goToLogin}
        className="max-h-screen max-w-full"
      />
      <button
        type="button"
        onClick={goToLogin}
        className="absolute bottom-8 right-8 rounded-pill border border-white/20 bg-black/30 px-5 py-2 text-sm text-white backdrop-blur-sm transition-colors hover:bg-black/50"
      >
        Pular →
      </button>
    </div>
  );
}
