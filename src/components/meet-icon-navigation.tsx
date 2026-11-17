"use client";

import { NavigationDropdown } from "./navigation-dropdown";
import { meetIconSections, meetIconUpcomingPages } from "@/content/meet-icon-navigation";

const items = meetIconSections.map(item => ({ label: item.label, href: `/meet-icon#${item.id}` }));

export function MeetIconNavigation(props: Readonly<{
  mobile?: boolean;
  index?: number;
  onNavigate?: () => void;
}>) {
  return <NavigationDropdown {...props} label="Meet ICON" href="/meet-icon"
    items={items} upcoming={meetIconUpcomingPages} overviewLabel="Meet ICON overview" />;
}
