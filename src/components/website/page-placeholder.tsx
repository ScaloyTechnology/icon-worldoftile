import { Container } from "@/components/ui/container";
import type { RouteDefinition } from "@/types/navigation";

type PagePlaceholderProps = Readonly<{
  page: RouteDefinition;
}>;

export function PagePlaceholder({ page }: PagePlaceholderProps) {
  return (
    <main className="flex-1" id="main-content">
      <Container className="py-[var(--section-space)]">
        <div className="grid gap-14 border-t border-line pt-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">
              {page.eyebrow}
            </p>
            <h1 className="mt-5 text-5xl leading-none font-medium tracking-[-0.05em] sm:text-7xl">
              {page.label}
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-muted">
              {page.description}
            </p>
          </div>

          <aside aria-label="Planned page sections" className="lg:pt-9">
            <p className="mb-4 text-sm font-medium">
              Planned for a later phase
            </p>
            <ul className="divide-y divide-line border-y border-line text-sm text-muted">
              {page.plannedSections.map((section) => (
                <li className="py-3" key={section}>
                  {section}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </Container>
    </main>
  );
}
