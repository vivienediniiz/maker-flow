'use client';

/**
 * ✅ Dashboard Error Handler
 * Catches errors within dashboard layout/pages
 * Allows recovery without full page reload
 */

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-lg bg-white/5 border border-white/10 p-8 text-center backdrop-blur">
        <div className="mb-4 text-5xl">❌</div>
        <h1 className="mb-2 text-xl font-bold text-text-primary">Erro no Dashboard</h1>
        <p className="mb-6 text-sm text-text-secondary">
          Não conseguimos carregar esta página. Tente recarregar ou volte ao início.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 rounded-lg bg-red-900/20 border border-red-500/30 p-3 text-left">
            <p className="mb-1 font-mono text-xs font-bold text-red-400">Dev Info:</p>
            <p className="font-mono text-xs text-red-300 break-all">{error.message}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 h-10 inline-flex items-center justify-center rounded-lg bg-neon-pink/20 text-neon-pink hover:bg-neon-pink/30 font-medium text-sm transition-colors"
          >
            Tentar novamente
          </button>
          <a
            href="/dashboard"
            className="flex-1 h-10 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 font-medium text-sm transition-colors"
          >
            Voltar
          </a>
        </div>
      </div>
    </div>
  );
}
