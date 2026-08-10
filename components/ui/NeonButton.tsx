import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}

export function NeonButton({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: NeonButtonProps) {
  const sizeClasses = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  const variantClasses = {
    primary: "neon-btn",
    ghost:
      "inline-flex items-center justify-center gap-2 rounded-pill text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors",
    outline:
      "inline-flex items-center justify-center gap-2 rounded-pill border border-border-glassStrong text-text-primary hover:border-neon-pink/60 hover:bg-white/5 transition-colors",
    danger:
      "inline-flex items-center justify-center gap-2 rounded-pill bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors",
  };

  return (
    <button
      className={cn(
        variantClasses[variant],
        variant !== "primary" && sizeClasses[size],
        variant === "primary" && size === "sm" && "px-4 py-2 text-xs",
        variant === "primary" && size === "lg" && "px-8 py-4 text-base",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
