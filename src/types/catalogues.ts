export type PublicCatalogue = Readonly<{
  id: string;
  slug: string;
  title: string;
  edition: string;
  cover: Readonly<{ src: string; alt: string; width: number; height: number }>;
  available: boolean;
  fileLabel: string;
}>;
