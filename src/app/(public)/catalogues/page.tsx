import { CataloguesExperience } from "@/components/catalogues/catalogues-experience";
import { pageMetadata } from "@/lib/seo";
import { getPublicCatalogues } from "@/server/catalogues/catalogues-data";

export const metadata = pageMetadata("Catalogues", "Browse and request ICON digital product catalogues and surface publications.", "/catalogues");

export default async function CataloguesPage() {
  const catalogues = await getPublicCatalogues();
  return <CataloguesExperience catalogues={catalogues} />;
}
