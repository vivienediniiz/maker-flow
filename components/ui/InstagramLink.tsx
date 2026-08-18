function buildInstagramLink(handle: string): string {
  const clean = handle.trim().replace(/^@/, "");
  return `https://instagram.com/${clean}`;
}

/** Ícone da marca Instagram — não tem equivalente no lucide-react (só ícones genéricos). */
function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="25%" stopColor="#FCAF45" />
          <stop offset="50%" stopColor="#E1306C" />
          <stop offset="75%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="url(#ig-gradient)" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke="url(#ig-gradient)" strokeWidth="2" />
      <circle cx="17.3" cy="6.7" r="1.15" fill="url(#ig-gradient)" />
    </svg>
  );
}

/** Renderiza um @handle como link clicável pro perfil do Instagram, com o ícone da marca. */
export function InstagramLink({ handle, className }: { handle: string; className?: string }) {
  const clean = handle.trim().replace(/^@/, "");
  return (
    <a
      href={buildInstagramLink(handle)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={className ?? "inline-flex items-center gap-1.5 hover:underline"}
      title="Abrir perfil no Instagram"
    >
      <InstagramIcon />@{clean}
    </a>
  );
}
