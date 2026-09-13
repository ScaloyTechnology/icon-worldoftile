import Link from "next/link";

import { siteConfig } from "@/constants/site";

type AdminShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="grid min-h-screen bg-background-secondary lg:grid-cols-[17rem_1fr]">
      <aside className="border-line bg-surface border-b p-6 lg:border-r lg:border-b-0">
        <Link
          className="text-sm font-semibold tracking-[0.14em] uppercase"
          href="/"
        >
          {siteConfig.name}
        </Link>
        <p className="mt-3 text-sm text-muted">Administration foundation</p>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
