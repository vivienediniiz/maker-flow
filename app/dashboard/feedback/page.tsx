"use client";

import { useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Star, Lightbulb, MessageSquareWarning, Check } from "lucide-react";
import type { FeedbackCategory } from "@/lib/types";

export default function FeedbackPage() {
  return (
    <>
      <Topbar title="Sugestões e Avaliação" />
      <main className="mx-auto max-w-2xl space-y-6 px-6 py-8 md:px-8">
        <SuggestionForm />
        <RatingForm />
      </main>
    </>
  );
}

function SuggestionForm() {
  const supabase = createClient();
  const [category, setCategory] = useState<Extract<FeedbackCategory, "suggestion" | "complaint">>("suggestion");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!message.trim()) {
      setError("Escreva sua sugestão ou reclamação antes de enviar.");
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada — faça login de novo.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("feedback_submissions").insert({
      user_id: user.id,
      category,
      message: message.trim(),
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMessage("");
    setDone(true);
    setTimeout(() => setDone(false), 4000);
  }

  return (
    <GlassCard padding="lg" className="space-y-4">
      <div>
        <h3 className="font-display text-lg">Sugestões e Reclamações</h3>
        <p className="text-sm text-text-secondary">
          Algo que poderia funcionar melhor, ou uma ideia pro StudioMaker? Manda aqui — lemos tudo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass-card flex gap-1 p-1">
          <button
            type="button"
            onClick={() => setCategory("suggestion")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-pill py-2 text-xs font-medium transition-colors",
              category === "suggestion" ? "bg-neon-gradient text-white" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <Lightbulb size={13} /> Sugestão
          </button>
          <button
            type="button"
            onClick={() => setCategory("complaint")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-pill py-2 text-xs font-medium transition-colors",
              category === "complaint" ? "bg-neon-gradient text-white" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <MessageSquareWarning size={13} /> Reclamação
          </button>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="glass-input w-full resize-none"
          placeholder={
            category === "suggestion"
              ? "Ex: seria ótimo ter um jeito de duplicar um produto já cadastrado..."
              : "Ex: tive um problema ao gerar o PDF de orçamento..."
          }
        />

        {error && <p className="text-xs text-red-400">{error}</p>}
        {done && (
          <p className="flex items-center gap-1.5 text-xs text-neon-green">
            <Check size={13} /> Enviado, obrigado!
          </p>
        )}

        <NeonButton type="submit" disabled={saving} className="w-full justify-center">
          {saving ? "Enviando..." : "Enviar"}
        </NeonButton>
      </form>
    </GlassCard>
  );
}

function RatingForm() {
  const supabase = createClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Escolha uma nota de 1 a 5 estrelas.");
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada — faça login de novo.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("feedback_submissions").insert({
      user_id: user.id,
      category: "rating",
      rating,
      message: comment.trim() || null,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setRating(0);
    setComment("");
    setDone(true);
    setTimeout(() => setDone(false), 4000);
  }

  return (
    <GlassCard padding="lg" className="space-y-4">
      <div>
        <h3 className="font-display text-lg">Avalie o StudioMaker</h3>
        <p className="text-sm text-text-secondary">O que você acha do sistema até aqui?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
              className="text-text-muted transition-colors"
            >
              <Star
                size={32}
                className={cn(
                  (hoverRating || rating) >= n ? "fill-neon-pink text-neon-pink" : "text-text-muted",
                  "transition-colors"
                )}
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="glass-input w-full resize-none"
          placeholder="Comentário (opcional)"
        />

        {error && <p className="text-xs text-red-400">{error}</p>}
        {done && (
          <p className="flex items-center gap-1.5 text-xs text-neon-green">
            <Check size={13} /> Obrigado pela avaliação!
          </p>
        )}

        <NeonButton type="submit" disabled={saving} className="w-full justify-center">
          {saving ? "Enviando..." : "Enviar Avaliação"}
        </NeonButton>
      </form>
    </GlassCard>
  );
}
