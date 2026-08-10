import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function GlassCard({
  className,
  hover = false,
  padding = "md",
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        hover ? "glass-card-hover" : "glass-card",
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
