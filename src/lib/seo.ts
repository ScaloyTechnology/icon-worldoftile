import type { Metadata } from "next";

import { companyContact } from "@/content/company";

export const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
export const indexable = process.env.SITE_INDEXABLE === "true" && process.env.NODE_ENV === "production";

export function pageMetadata(title: string, description: string, path = "/", published = false): Metadata {
  return { title, description, alternates: { canonical: path }, robots: { index: indexable && published, follow: indexable && published }, openGraph: { title: `${title} | ICON`, description, url: path, siteName: "ICON — World of Tile", type: "website" } };
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org", "@type": "Organization", name: "ICON — World of Tile", url: siteUrl,
    logo: new URL("/brand/icon-logo-horizontal.png", siteUrl).href,
    email: companyContact.domestic.email,
    telephone: companyContact.domestic.phone,
    contactPoint: [
      { "@type": "ContactPoint", contactType: "domestic inquiries", telephone: companyContact.domestic.phone, email: companyContact.domestic.email, areaServed: "IN" },
      { "@type": "ContactPoint", contactType: "export inquiries", telephone: companyContact.export.phone, email: companyContact.export.email },
    ],
    address: companyContact.units.map((unit) => ({
      "@type": "PostalAddress", name: unit.name, streetAddress: unit.addressLines.join(" "),
      addressRegion: "Gujarat", addressCountry: "IN",
    })),
    sameAs: companyContact.socials.map((social) => social.href),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: new URL(item.path, siteUrl).href })) };
}

export function serializeSchema(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
