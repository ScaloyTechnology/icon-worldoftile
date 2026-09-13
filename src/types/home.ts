export type MediaTone = "clay" | "deep" | "mineral" | "sand" | "stone";

export type HomeMedia = Readonly<{
  src: string | null;
  alt: string;
  placeholderLabel: string;
  tone: MediaTone;
  position?: string;
  width?: number;
  height?: number;
}>;

export type FeaturedCollection = Readonly<{
  id: string;
  name: string;
  slug: string;
  eyebrow: string;
  media: HomeMedia;
}>;

export type ApplicationItem = Readonly<{
  id: string;
  name: string;
  media: HomeMedia;
}>;

export type CertificationPlaceholder = Readonly<{
  id: string;
  label: string;
  supportingText: string;
  issuer?: string;
  year?: string;
  documentHref?: string;
}>;

export type CataloguePlaceholder = Readonly<{
  id: string;
  title: string;
  edition: string;
  media: HomeMedia;
}>;
