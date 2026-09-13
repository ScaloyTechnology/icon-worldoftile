import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/eyebrow";

type SectionHeaderProps = Readonly<{
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  inverse?: boolean;
}>;

export function SectionHeader({
  eyebrow,
  title,
  description,
  className = "",
  inverse = false,
}: SectionHeaderProps) {
  return (
    <header className={className}>
      <Eyebrow className={inverse ? "text-on-dark-muted" : "text-muted"}>
        {eyebrow}
      </Eyebrow>
      <h2 className="type-h2 mt-5">{title}</h2>
      {description ? (
        <p
          className={`type-body-lg mt-7 max-w-2xl ${
            inverse ? "text-on-dark-muted" : "text-muted"
          }`}
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}
