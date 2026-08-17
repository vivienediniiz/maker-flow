"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NeonButton } from "@/components/ui/NeonButton";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { AuthTypewriter } from "@/components/auth/AuthTypewriter";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const oauthError = new URLSearchParams(window.location.search).get("oauth_error");
    if (oauthError) setError(oauthError);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg">
      {/* Fundo: 3 blobs orgânicos animados, cada um com gradiente/trajetória/duração própria */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="animate-blob-1 absolute -left-[15%] -top-[15%] h-[62vw] w-[62vw] opacity-25 blur-[90px]"
          style={{
            background: "linear-gradient(135deg, #E86333 0%, #FF4EDF 55%, #AA17DB 100%)",
            borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
          }}
        />
        <div
          className="animate-blob-2 absolute -right-[18%] top-[2%] h-[55vw] w-[55vw] opacity-20 blur-[90px]"
          style={{
            background: "linear-gradient(210deg, #FF4EDF 0%, #AA17DB 55%, #E86333 100%)",
            borderRadius: "50% 50% 40% 60% / 60% 40% 60% 40%",
            animationDelay: "-11s",
          }}
        />
        <div
          className="animate-blob-3 absolute -bottom-[20%] left-[18%] h-[58vw] w-[58vw] opacity-20 blur-[100px]"
          style={{
            background: "linear-gradient(300deg, #AA17DB 0%, #E86333 55%, #FF4EDF 100%)",
            borderRadius: "45% 55% 65% 35% / 40% 60% 40% 60%",
            animationDelay: "-23s",
          }}
        />
      </div>

      {/* Logo fixo no canto superior esquerdo */}
      <div className="absolute left-6 top-6 z-20 flex items-center gap-2 sm:left-10 sm:top-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon-gradient shadow-neon-glow">
          <Zap size={18} className="text-white" />
        </div>
        <span className="font-display text-lg tracking-wide text-text-primary">StudioMaker</span>
      </div>

      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Lado esquerdo: headline com efeito de digitação */}
        <div className="relative hidden overflow-hidden px-20 lg:flex lg:flex-col lg:justify-center xl:px-28 2xl:px-32">
          <AuthTypewriter />
        </div>

        {/* Lado direito: painel de vidro líquido com o formulário */}
        <div className="flex items-center justify-center px-6 py-24 sm:px-12">
          <div className="glass-card animate-panel-in w-full max-w-sm space-y-6 p-8 opacity-0 shadow-neon-glow">
            <div>
              <h2 className="font-display text-2xl">Bem-vindo de volta</h2>
              <p className="mt-1 text-sm text-text-secondary">Entre para acessar seu estúdio.</p>
            </div>

            <SocialAuthButtons />

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border-glass" />
              <span className="text-xs text-text-muted">ou com e-mail</span>
              <div className="h-px flex-1 bg-border-glass" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input w-full"
                  placeholder="voce@estudio.com"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs text-text-muted">Senha</label>
                  <Link href="/reset-password" className="text-xs text-neon-pink hover:underline">
                    Esqueceu?
                  </Link>
                </div>
                <PasswordInput
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <NeonButton type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </NeonButton>
            </form>

            <p className="text-center text-sm text-text-secondary">
              Não tem conta?{" "}
              <Link href="/signup" className="text-neon-pink hover:underline">
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
