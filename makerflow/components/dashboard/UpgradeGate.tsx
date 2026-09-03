import Link from "next/link";
import { Lock } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export function UpgradeGate({ title, description }: { title: string; description: string }) {
  return (
    <GlassCard padding="lg" className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
        <Lock size={24} />
      </div>
      <div>
        <p className="font-display text-lg">{title}</p>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      <Link href="/dashboard/subscription" className="neon-btn">
        Assinar Agora
      </Link>
    </GlassCard>
  );
}
