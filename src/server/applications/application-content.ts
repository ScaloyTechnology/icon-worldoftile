import "server-only";

import { cache } from "react";
import { applicationsHero, documentedUseCaseOrder, fallbackApplications } from "@/content/applications";
import { buildApplicationProductHref, normalizePublishedApplications } from "@/lib/applications/application-data";
import { getDb } from "@/server/db";
import { getProductDiscovery } from "@/server/products/product-discovery";
import type { ApplicationContent, ApplicationDatabaseRow, ApplicationsPageData } from "@/types/applications";

type LooseDelegate = Readonly<{ findMany?: (query: unknown) => Promise<ApplicationDatabaseRow[]> }>;

async function readPublishedApplications() {
  const db = getDb() as unknown as Record<string, LooseDelegate | undefined>;
  if (!db.application?.findMany) throw new Error("Application content model is unavailable");
  const rows = await db.application.findMany({
    where: { state: "PUBLISHED" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const normalized = normalizePublishedApplications(rows, fallbackApplications);
  if (normalized.length !== fallbackApplications.length) throw new Error("Required published application content is incomplete");
  return normalized;
}

async function resolveApplications(): Promise<{ applications: readonly ApplicationContent[]; source: ApplicationsPageData["source"] }> {
  if (!process.env.DATABASE_URL) return { applications: fallbackApplications, source: "development-fallback" };
  try {
    const applications = await Promise.race([
      readPublishedApplications(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Application data timeout")), 1200)),
    ]);
    return { applications, source: "database" };
  } catch {
    return { applications: fallbackApplications, source: "development-fallback" };
  }
}

export const getApplicationsPageData = cache(async (): Promise<ApplicationsPageData> => {
  const [{ applications, source }, discovery] = await Promise.all([resolveApplications(), getProductDiscovery()]);
  const applicationGroup = discovery.filterGroups.find((group) => group.key === "applications");
  const supportedUses = new Map((applicationGroup?.options ?? []).map((option) => [option.value.toLocaleLowerCase(), option.value]));

  return {
    hero: applicationsHero,
    source,
    applications: applications.map((application) => ({
      ...application,
      productHref: buildApplicationProductHref(application.name, discovery.filterGroups, discovery.collections),
      products: discovery.products
        .filter((product) => product.applications.some((value) => value.localeCompare(application.name, undefined, { sensitivity: "accent" }) === 0))
        .slice(0, 3)
        .map((product) => ({ id: product.id, name: product.name, slug: product.slug, category: product.category, media: product.primaryMedia })),
    })),
    discoveryLinks: documentedUseCaseOrder.flatMap((label, index) => {
      const supported = supportedUses.get(label.toLocaleLowerCase());
      return supported ? [{ index: String(index + 1).padStart(2, "0"), label: supported, href: buildApplicationProductHref(supported, discovery.filterGroups, discovery.collections) }] : [];
    }),
  };
});
