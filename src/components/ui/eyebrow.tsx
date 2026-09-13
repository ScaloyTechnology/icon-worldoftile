import type { ComponentPropsWithoutRef } from "react";

export function Eyebrow({
  className = "",
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return <p className={`type-label ${className}`} {...props} />;
}
