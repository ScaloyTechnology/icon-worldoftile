import Link from "next/link";

type TextLinkProps = Readonly<{
  href: string;
  children: React.ReactNode;
  className?: string;
  magnetic?: boolean;
}>;

export function TextLink({ href, children, className = "", magnetic = false }: TextLinkProps) {
  return (
    <Link className={`text-link ${className}`} href={href} data-magnetic={magnetic || undefined} data-cursor={magnetic ? "Explore" : undefined}>
      <span>{children}</span>
      <span aria-hidden="true">↗</span>
    </Link>
  );
}
