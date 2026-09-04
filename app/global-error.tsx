'use client';

/**
 * ✅ Global Error Handler (Next.js 14 App Router)
 * Catches unhandled errors during rendering
 * Replaces default Next.js error page with branded fallback
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-bg text-text-primary">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="max-w-md text-center">
            <div className="mb-6 text-6xl">⚠️</div>
            <h1 className="mb-2 text-2xl font-bold">Algo deu errado</h1>
            <p className="mb-6 text-text-secondary">
              Desculpe, encontramos um erro inesperado. Tente recarregar a página.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 rounded-lg bg-red-900/20 border border-red-500/30 p-4 text-left">
                <p className="mb-2 font-mono text-xs font-bold text-red-400">Error Details:</p>
                <p className="font-mono text-xs text-red-300 break-all">{error.message}</p>
                {error.digest && (
                  <p className="mt-2 font-mono text-xs text-red-300">ID: {error.digest}</p>
                )}
              </div>
            )}

            <button
              onClick={() => reset()}
              className="inline-flex h-11 min-w-max items-center justify-center rounded-pill bg-neon-gradient px-6 py-2.5 font-semibold text-white transition-transform hover:scale-105 active:scale-95"
            >
              Tentar novamente
            </button>

            <p className="mt-6 text-xs text-text-muted">
              Se o problema persistir, contate{' '}
              <a
                href="mailto:support@studiomaker3d.com.br"
                className="text-neon-pink hover:underline"
              >
                suporte
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
