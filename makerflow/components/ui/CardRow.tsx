/** Linha rótulo + valor usada nos cards empilhados do mobile (abaixo de md), espelhando uma coluna de tabela. */
export function CardRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-xs">
      <span className="shrink-0 text-text-muted">{label}</span>
      <span className="min-w-0 text-right text-text-secondary">{children}</span>
    </div>
  );
}
