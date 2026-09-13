import Link from "next/link";

import { BrandMark } from "@/components/layout/brand-mark";
import { Container } from "@/components/ui/container";
import { TextLink } from "@/components/ui/text-link";
import { primaryNavigation, siteConfig } from "@/constants/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-surface-dark text-on-dark">
      <Container className="pt-16 pb-8 sm:pt-20 lg:pt-28" size="wide">
        <div className="grid gap-16 border-b border-on-dark/15 pb-16 lg:grid-cols-[1.35fr_0.65fr] lg:gap-24 lg:pb-24">
          <div>
            <BrandMark />
            <p className="type-h3 mt-12 max-w-3xl sm:mt-16">
              Surfaces shape the way a space is seen, touched, and remembered.
            </p>
            <TextLink className="mt-10" href="/contact">
              Begin an enquiry
            </TextLink>
          </div>

          <nav aria-label="Footer navigation" className="lg:pt-1">
            <p className="type-label text-on-dark-muted">Explore</p>
            <ul className="mt-7 grid grid-cols-2 gap-x-8 gap-y-1">
              {primaryNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    className="inline-flex py-2.5 text-sm text-on-dark-muted transition-colors hover:text-on-dark"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="type-caption flex flex-col gap-3 pt-7 text-on-dark-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
          <p>Official contact details to be added</p>
        </div>
      </Container>
    </footer>
  );
}
