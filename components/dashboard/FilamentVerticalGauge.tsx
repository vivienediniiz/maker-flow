import { cn } from "@/lib/utils";

interface FilamentVerticalGaugeProps {
  colorHex: string;
  fillPercent: number;
  size?: "sm" | "md";
}

const SIZE_CLASSES = {
  sm: "h-16 w-8",
  md: "h-32 w-16",
};

export function FilamentVerticalGauge({ colorHex, fillPercent, size = "md" }: FilamentVerticalGaugeProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-b-2xl rounded-t-md border border-white/10 bg-white/[0.03]",
        SIZE_CLASSES[size]
      )}
    >
      <div
        className="absolute bottom-0 left-0 right-0 transition-all"
        style={{ height: `${Math.max(0, Math.min(100, fillPercent))}%`, backgroundColor: colorHex, opacity: 0.85 }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10" />
    </div>
  );
}
