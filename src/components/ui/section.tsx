import type { ComponentPropsWithoutRef } from "react";

type SectionProps = ComponentPropsWithoutRef<"section"> &
  Readonly<{
    compact?: boolean;
  }>;

export function Section({
  className = "",
  compact = false,
  ...props
}: SectionProps) {
  return (
    <section
      className={`${compact ? "section-space-compact" : "section-space"} ${className}`}
      {...props}
    />
  );
}
