import { Bell, Search } from "lucide-react";

export function Topbar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border-glass bg-bg/70 px-6 py-4 backdrop-blur-glass md:px-8">
      <h1 className="font-display text-xl text-text-primary">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-pill border border-border-glass bg-white/[0.03] px-4 py-2 text-sm text-text-muted sm:flex">
          <Search size={14} />
          <span>Buscar pedidos, clientes...</span>
        </div>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border-glass bg-white/[0.03] text-text-secondary hover:text-text-primary">
          <Bell size={16} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-neon-pink" />
        </button>
        <div className="h-9 w-9 rounded-full bg-neon-gradient" />
      </div>
    </header>
  );
}
