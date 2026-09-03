"use client";

interface CategoryNavProps {
  categories: string[];
  activeCategory: string | null;
  onSelect: (category: string | null) => void;
  primaryColor: string;
}

/** Barra de categorias fixa no topo da loja — nav horizontal + faixa de destaque embaixo. */
export function CategoryNav({ categories, activeCategory, onSelect, primaryColor }: CategoryNavProps) {
  if (categories.length === 0) return null;

  return (
    <div className="w-full bg-white">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 py-3.5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-[11px] font-semibold uppercase tracking-wider transition-colors sm:text-xs"
          style={{ color: activeCategory === null ? primaryColor : "#4A4458" }}
        >
          Todas
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onSelect(c)}
            className="text-[11px] font-semibold uppercase tracking-wider transition-colors sm:text-xs"
            style={{ color: activeCategory === c ? primaryColor : "#4A4458" }}
          >
            {c}
          </button>
        ))}
      </nav>
      <div className="h-2 w-full" style={{ backgroundColor: primaryColor }} />
    </div>
  );
}
