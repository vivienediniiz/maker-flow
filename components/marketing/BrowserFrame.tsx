import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrowserFrameProps {
  /** Texto da barra de endereço — default é a URL do app. */
  title?: string;
  className?: string;
  /** Mockup em código (JSX) — quando presente, ignora `src`/`alt`/etc e o Image não é renderizado. */
  children?: React.ReactNode;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
}

export function BrowserFrame({
  title = "app.studiomaker.com.br",
  className,
  children,
  src,
  alt,
  width,
  height,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority,
}: BrowserFrameProps) {
  return (
    <div className={cn("glass-card overflow-hidden shadow-neon-glow", className)}>
      <div className="flex items-center gap-2 border-b border-border-glass bg-white/[0.03] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        </div>
        <div className="ml-2 flex-1 truncate rounded-pill bg-white/5 px-3 py-1 text-center text-[11px] text-text-muted">
          {title}
        </div>
      </div>
      {children ? (
        <div className="bg-bg-raised">{children}</div>
      ) : src && alt && width && height ? (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          quality={92}
          priority={priority}
          className="h-auto w-full"
        />
      ) : null}
    </div>
  );
}
