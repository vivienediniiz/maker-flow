"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NeonButton } from "@/components/ui/NeonButton";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { AuthTypewriter } from "@/components/auth/AuthTypewriter";
import { Starfield } from "@/components/auth/Starfield";

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
      {/* Fundo: céu estrelado com brilho roxo/violeta nos cantos */}
      <div
        className="pointer-events-none absolute -left-[10%] -top-[20%] h-[70vw] w-[70vw] opacity-80 blur-[110px]"
        style={{ background: "radial-gradient(circle, #AA17DB 0%, rgba(170,23,219,0) 70%)" }}
      />
      <div
        className="pointer-events-none absolute -right-[15%] top-[10%] h-[55vw] w-[55vw] opacity-40 blur-[120px]"
        style={{ background: "radial-gradient(circle, #7C3AED 0%, rgba(124,58,237,0) 70%)" }}
      />
      <Starfield />

      {/* Logo fixo no canto superior esquerdo */}
      <div className="absolute left-6 top-6 z-20 flex items-center gap-2 sm:left-10 sm:top-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="" className="h-9 w-9" />
        <span className="font-display text-lg tracking-wide text-text-primary">StudioMaker</span>
      </div>

      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Lado esquerdo: headline com efeito de digitação */}
        <div className="relative hidden overflow-hidden px-20 lg:flex lg:flex-col lg:justify-center xl:px-28 2xl:px-32">
          <AuthTypewriter />
        </div>

        {/* Lado direito: painel de vidro líquido com o formulário */}
        <div className="flex items-center justify-center px-6 py-24 sm:px-12">
          <div className="glass-card animate-panel-in w-full max-w-sm space-y-6 bg-bg/80 p-8 opacity-0 shadow-neon-glow">
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
