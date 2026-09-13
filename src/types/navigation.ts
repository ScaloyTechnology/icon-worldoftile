export type NavigationItem = Readonly<{
  href: string;
  label: string;
}>;

export type RouteDefinition = NavigationItem &
  Readonly<{
    description: string;
    eyebrow: string;
    plannedSections: readonly string[];
  }>;
