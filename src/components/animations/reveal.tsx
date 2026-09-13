"use client";

import { type RevealVariant, useGsapReveal } from "@/hooks/use-gsap-reveal";

type RevealProps = Readonly<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
  variant?: RevealVariant;
}>;

export function Reveal({
  children,
  className = "",
  delay = 0,
  distance = 28,
  variant = "editorial",
}: RevealProps) {
  const revealRef = useGsapReveal<HTMLDivElement>({
    delay,
    distance,
    variant,
  });

  return (
    <div className={className} ref={revealRef}>
      {children}
    </div>
  );
}
