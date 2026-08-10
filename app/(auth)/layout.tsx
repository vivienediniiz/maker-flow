import { Zap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-center px-8 py-12 sm:px-16">
        <div className="mb-10 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon-gradient shadow-neon-glow">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-display text-lg tracking-wide">MakerFlow</span>
        </div>
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden bg-bg-raised lg:block">
        <div className="absolute inset-0 bg-radial-glow" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="glass-card max-w-md space-y-4 p-8 shadow-neon-glow">
            <p className="font-display text-2xl">
              Precifique, produza e venda — tudo em um farm de dados só seu.
            </p>
            <p className="text-sm text-text-secondary">
              Gestão completa para estúdios de impressão 3D: orçamentos inteligentes, pedidos, estoque e insights financeiros em tempo real.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
