import type { NavigationItem, RouteDefinition } from "@/types/navigation";

const fallbackSiteUrl = "http://localhost:3000";

function resolveSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!configuredUrl) {
    return fallbackSiteUrl;
  }

  try {
    return new URL(configuredUrl).toString();
  } catch {
    return fallbackSiteUrl;
  }
}

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "ICON \u2014 World of Tile",
  description:
    "Explore ICON architectural surfaces, collections, applications, catalogues, and material inspiration.",
  url: resolveSiteUrl(),
} as const;

export const primaryNavigation: readonly NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/meet-icon", label: "Meet ICON" },
  { href: "/products", label: "Products" },
  { href: "/catalogues", label: "Catalogues" },
  { href: "/technical-specs", label: "Technical specs" },
  { href: "/applications", label: "Applications" },
  { href: "/projects", label: "Projects" },
  { href: "/contact", label: "Contact" },
] as const;

export const publicRoutes = {
  meetIcon: {
    href: "/meet-icon",
    label: "Meet ICON",
    eyebrow: "Company",
    description:
      "A future home for ICON's history, values, technology, markets, certifications, and research.",
    plannedSections: [
      "Iconic journey",
      "Brand values",
      "Technology and R&D",
      "Markets and certifications",
    ],
  },
  products: {
    href: "/products",
    label: "Products",
    eyebrow: "Product library",
    description:
      "The product discovery architecture will support collections, structured filters, and specification-led browsing.",
    plannedSections: [
      "Featured collections",
      "Product listing",
      "Size, finish, surface, colour, and look filters",
      "Application browsing",
    ],
  },
  catalogues: {
    href: "/catalogues",
    label: "Catalogues",
    eyebrow: "Downloads",
    description:
      "A managed catalogue library will make current product publications easy to browse and download.",
    plannedSections: ["Catalogue listing", "Managed downloads"],
  },
  technicalSpecs: {
    href: "/technical-specs",
    label: "Technical specs",
    eyebrow: "Product intelligence",
    description:
      "A structured technical resource for product properties, applications, certifications, and documentation.",
    plannedSections: [
      "Product specifications",
      "Size, thickness, surface, and finish",
      "Technical sheets",
      "Certifications and downloads",
    ],
  },
  applications: {
    href: "/applications",
    label: "Applications",
    eyebrow: "Built environments",
    description:
      "Application-led discovery will connect tile solutions to the spaces and industries they serve.",
    plannedSections: [
      "Residential",
      "Commercial",
      "Hospitality and retail",
      "Office and outdoor",
    ],
  },
  projects: {
    href: "/projects",
    label: "Projects",
    eyebrow: "Case studies",
    description:
      "A project library will connect locations, galleries, applications, and the products used in each space.",
    plannedSections: [
      "Featured projects",
      "Project categories",
      "Project listing and gallery",
      "Locations and products used",
    ],
  },
  contact: {
    href: "/contact",
    label: "Contact",
    eyebrow: "Enquiries",
    description:
      "A future enquiry experience backed by first-party APIs and persistent PostgreSQL storage.",
    plannedSections: [
      "Enquiry form",
      "Contact details",
      "Location",
      "FAQs and final call to action",
    ],
  },
} satisfies Record<string, RouteDefinition>;
