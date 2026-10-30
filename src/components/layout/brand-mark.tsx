import Link from "next/link";
import { BRAND_LOGO } from "@/lib/brand";

type BrandMarkProps = Readonly<{
  className?: string;
  onClick?: () => void;
}>;

export function BrandMark({ className = "", onClick }: BrandMarkProps) {
  return (
    <Link
      aria-label={BRAND_LOGO.alt + ", home"}
      className={"inline-flex shrink-0 items-center " + className}
      href="/"
      onClick={onClick}
    >
      <span aria-hidden="true" style={{
        display: "block",
        height: "4.25rem",
        aspectRatio: BRAND_LOGO.width + " / " + BRAND_LOGO.height,
        backgroundColor: "currentColor",
        mask: "url(" + BRAND_LOGO.src + ") center / contain no-repeat",
        WebkitMask: "url(" + BRAND_LOGO.src + ") center / contain no-repeat",
      }} />
    </Link>
  );
}
