import type { Metadata } from "next";

import { companyContact } from "@/content/company";
import type { PublicContactSettings } from "@/types/contact-settings";

const fallbackSiteUrl = "http://localhost:3000";

export function resolveSiteUrl(value = process.env.SITE_URL) {
  if (!value) return fallbackSiteUrl;

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;

  try {
    return new URL(withProtocol).toString();
  } catch {
    return fallbackSiteUrl;
  }
}

export const siteUrl = resolveSiteUrl();
export const indexable = process.env.SITE_INDEXABLE === "true" && process.env.NODE_ENV === "production";

export function pageMetadata(title: string, description: string, path = "/", published = false): Metadata {
  return { title, description, alternates: { canonical: path }, robots: { index: indexable && published, follow: indexable && published }, openGraph: { title: `${title} | ICON`, description, url: path, siteName: "ICON — World of Tile", type: "website" } };
}

export function organizationSchema(settings?: PublicContactSettings) {
  const domestic = settings?.domestic ?? companyContact.domestic;
  const exportContact = settings?.export ?? companyContact.export;
  const units = settings?.units ?? companyContact.units;
  const socials = settings?.socials ?? companyContact.socials;
  const logo = settings?.logo.src ?? "/brand/icon-logo-horizontal.png";
  return {
    "@context": "https://schema.org", "@type": "Organization", name: "ICON — World of Tile", url: siteUrl,
    logo: new URL(logo, siteUrl).href,
    email: domestic.email,
    telephone: domestic.phone,
    contactPoint: [
      { "@type": "ContactPoint", contactType: "domestic inquiries", telephone: domestic.phone, email: domestic.email, areaServed: "IN" },
      { "@type": "ContactPoint", contactType: "export inquiries", telephone: exportContact.phone, email: exportContact.email },
    ],
    address: units.map((unit) => ({
      "@type": "PostalAddress", name: unit.name, streetAddress: unit.addressLines.join(" "),
      addressRegion: "Gujarat", addressCountry: "IN",
    })),
    sameAs: socials.map((social) => social.href),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: new URL(item.path, siteUrl).href })) };
}

export function serializeSchema(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
