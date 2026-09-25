export type CatalogueAdminAsset = Readonly<{
  id: string;
  src: string;
  alt: string;
  filename: string;
  byteSize: string;
  mimeType: string;
  width: number | null;
  height: number | null;
}>;

export type CatalogueAdminRecord = Readonly<{
  id: string;
  title: string;
  slug: string;
  state: "DRAFT" | "PUBLISHED";
  updatedAt: string;
  cover: CatalogueAdminAsset | null;
  pdf: CatalogueAdminAsset | null;
}>;
