import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrowserFrameProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
}

export function BrowserFrame({
  src,
  alt,
  width,
  height,
  sizes = "(max-width: 768px) 100vw, 50vw",
  className,
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
          app.studiomaker.com.br
        </div>
      </div>
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
    </div>
  );
}
