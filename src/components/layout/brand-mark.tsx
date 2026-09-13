import Link from "next/link";

type BrandMarkProps = Readonly<{
  className?: string;
  onClick?: () => void;
}>;

export function BrandMark({ className = "", onClick }: BrandMarkProps) {
  return (
    /* Replace this text lock-up with the approved ICON logo asset when supplied. */
    <Link
      aria-label="ICON — World of Tile, home"
      className={`inline-flex shrink-0 items-baseline gap-2.5 ${className}`}
      href="/"
      onClick={onClick}
    >
      <span className="text-[1.05rem] leading-none font-semibold tracking-[0.16em]">
        ICON
      </span>
      <span className="hidden text-[0.64rem] leading-none tracking-[0.12em] uppercase sm:inline">
        World of Tile
      </span>
    </Link>
  );
}
