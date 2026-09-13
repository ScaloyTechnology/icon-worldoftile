import type { Metadata } from "next";

type PageMetadataInput = Readonly<{
  title: string;
  description: string;
  path: string;
}>;

export function createPageMetadata({
  title,
  description,
  path,
}: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
    },
    twitter: {
      title,
      description,
    },
  };
}
