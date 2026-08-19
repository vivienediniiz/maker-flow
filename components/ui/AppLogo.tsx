"use client";

import { useRouter } from "next/navigation";

interface AppLogoProps {
  wrapperClassName?: string;
  iconClassName?: string;
  textClassName?: string;
  showLabel?: boolean;
}

// Logo clicável usada em qualquer lugar da aplicação: em vez de navegar
// direto, sempre passa pela splash (`/?from=logo`, 2s) antes de cair no
// dashboard ou login — reforça a marca e força uma atualização do app.
export function AppLogo({
  wrapperClassName = "flex items-center gap-2",
  iconClassName = "h-9 w-9",
  textClassName = "font-display text-lg tracking-wide",
  showLabel = true,
}: AppLogoProps) {
  const router = useRouter();

  return (
    <button type="button" onClick={() => router.push("/?from=logo")} className={wrapperClassName}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-icon.png" alt="StudioMaker" className={iconClassName} />
      {showLabel && <span className={textClassName}>StudioMaker</span>}
    </button>
  );
}
