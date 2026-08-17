import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { MessageCircle } from "lucide-react";

const SUPPORT_WHATSAPP_NUMBER = "5531971983044";

export default function SupportPage() {
  return (
    <>
      <Topbar title="Suporte" />
      <main className="px-6 py-8 md:px-8">
        <GlassCard padding="lg" className="mx-auto max-w-lg space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-green">
            <MessageCircle size={26} />
          </div>
          <div>
            <h2 className="font-display text-xl">Suporte Direto</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Precisa de ajuda com o StudioMaker, sua impressora conectada, ou tem uma dúvida sobre sua conta?
              Fale direto com a gente pelo WhatsApp — respondemos o mais rápido possível.
            </p>
          </div>
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <NeonButton className="w-full justify-center">
              <MessageCircle size={16} /> Conversar no WhatsApp
            </NeonButton>
          </a>
        </GlassCard>
      </main>
    </>
  );
}
