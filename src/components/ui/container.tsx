import type { ComponentPropsWithoutRef } from "react";

type ContainerProps = {
  size?: "content" | "default" | "wide";
} & ComponentPropsWithoutRef<"div">;

const maxWidthClasses = {
  content: "max-w-[var(--container-content)]",
  default: "max-w-[var(--container-max)]",
  wide: "max-w-[var(--container-wide)]",
} as const;

export function Container({
  className = "",
  size = "default",
  ...props
}: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full px-[var(--container-gutter)] ${maxWidthClasses[size]} ${className}`}
      {...props}
    />
  );
}
