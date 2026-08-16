"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Printer, BarChart3, Package, Layers } from "lucide-react";
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
      {/* Fundo degradê animado */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-aurora-a absolute -left-1/4 -top-1/4 h-[70vw] w-[70vw] rounded-full bg-neon-orange/30 blur-[120px]" />
        <div className="animate-aurora-b absolute -right-1/4 top-1/3 h-[60vw] w-[60vw] rounded-full bg-neon-pink/25 blur-[120px]" />
        <div className="animate-aurora-c absolute -bottom-1/4 left-1/4 h-[65vw] w-[65vw] rounded-full bg-neon-purple/30 blur-[120px]" />
      </div>

      {/* Logo fixo no canto superior esquerdo */}
      <div className="absolute left-6 top-6 z-20 flex items-center gap-2 sm:left-10 sm:top-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon-gradient shadow-neon-glow">
          <Zap size={18} className="text-white" />
        </div>
        <span className="font-display text-lg tracking-wide text-text-primary">MakerFlow</span>
      </div>

      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Lado esquerdo: headline com efeito de digitação + ícones flutuantes */}
        <div className="relative hidden overflow-hidden px-16 lg:flex lg:flex-col lg:justify-center">
          <Printer
            className="animate-float-y absolute left-[12%] top-[22%] h-10 w-10 text-white/10"
            style={{ animationDelay: "0s" }}
          />
          <BarChart3
            className="animate-float-y absolute right-[18%] top-[16%] h-8 w-8 text-white/10"
            style={{ animationDelay: "1.5s" }}
          />
          <Package
            className="animate-float-y absolute bottom-[24%] left-[22%] h-9 w-9 text-white/10"
            style={{ animationDelay: "3s" }}
          />
          <Layers
            className="animate-float-y absolute bottom-[18%] right-[14%] h-7 w-7 text-white/10"
            style={{ animationDelay: "2s" }}
          />

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
