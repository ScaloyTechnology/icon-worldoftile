"use client";

import { NavigationDropdown } from "./navigation-dropdown";

const items = [
  { label: "Domestic", href: "/products" },
  { label: "Export", href: "/products/export" },
] as const;

export function ProductsNavigation(props: Readonly<{
  mobile?: boolean;
  index?: number;
  onNavigate?: () => void;
}>) {
  return <NavigationDropdown {...props} label="Products" href="/products" items={items} />;
}
