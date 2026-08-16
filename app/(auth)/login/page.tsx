"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NeonButton } from "@/components/ui/NeonButton";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Bem-vindo de volta</h1>
        <p className="mt-1 text-sm text-text-secondary">Entre para acessar seu estúdio.</p>
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
  );
}