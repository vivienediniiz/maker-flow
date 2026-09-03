"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

interface AppLogoProps {
  wrapperClassName?: string;
  iconClassName?: string;
  textClassName?: string;
  showLabel?: boolean;
}

// Logo clicável usada em qualquer lugar da aplicação: em vez de navegar
// direto, sempre passa pela splash (`/splash?from=logo`, 2s) antes de cair no
// dashboard ou login — reforça a marca e força uma atualização do app.
export function AppLogo({
  wrapperClassName = "flex items-center gap-2",
  iconClassName = "h-9 w-9",
  textClassName = "font-display text-lg tracking-wide",
  showLabel = true,
}: AppLogoProps) {
  const router = useRouter();

  return (
    <button type="button" onClick={() => router.push("/splash?from=logo")} className={wrapperClassName}>
      <Image src="/logo-icon.png" alt="StudioMaker" width={36} height={36} className={iconClassName} />
      {showLabel && <span className={textClassName}>StudioMaker</span>}
    </button>
  );
}
