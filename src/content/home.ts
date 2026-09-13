import { clientAssets } from "@/content/assets";
import type {
  ApplicationItem,
  CataloguePlaceholder,
  CertificationPlaceholder,
  FeaturedCollection,
} from "@/types/home";

export const heroMedia = clientAssets.crossCut;

export const discoverMedia = clientAssets.fenix;

export const surfaceMedia = clientAssets.travertino;

export const featuredCollections = [
  {
    id: "collection-01",
    name: "Travertine study",
    slug: "collection-01",
    eyebrow: "Client image study",
    media: clientAssets.crossCut,
  },
  {
    id: "collection-02",
    name: "Cotto study",
    slug: "collection-02",
    eyebrow: "Client image study",
    media: clientAssets.cotto,
  },
  {
    id: "collection-03",
    name: "Mystone study",
    slug: "collection-03",
    eyebrow: "Client image study",
    media: clientAssets.mystone,
  },
  {
    id: "collection-04",
    name: "Star study",
    slug: "collection-04",
    eyebrow: "Client image study",
    media: clientAssets.star,
  },
] satisfies readonly FeaturedCollection[];

export const surfaceDetails = [
  "Quiet texture",
  "Measured depth",
  "Tactile character",
] as const;

export const applications = [
  {
    id: "residential",
    name: "Residential",
    media: clientAssets.fenix,
  },
  {
    id: "commercial",
    name: "Commercial",
    media: clientAssets.commercial,
  },
  {
    id: "hospitality",
    name: "Hospitality",
    media: clientAssets.hospitality,
  },
  {
    id: "retail",
    name: "Retail",
    media: clientAssets.retail,
  },
  {
    id: "office",
    name: "Office",
    media: clientAssets.office,
  },
  {
    id: "outdoor",
    name: "Outdoor",
    media: clientAssets.outdoor,
  },
] satisfies readonly ApplicationItem[];

export const certifications = [
  {
    id: "certification-01",
    label: "Certification record 01",
    supportingText: "Awaiting approved certification name and mark",
  },
  {
    id: "certification-02",
    label: "Certification record 02",
    supportingText: "Awaiting approved certification name and mark",
  },
  {
    id: "certification-03",
    label: "Certification record 03",
    supportingText: "Awaiting approved certification name and mark",
  },
] satisfies readonly CertificationPlaceholder[];

export const catalogues = [
  {
    id: "catalogue-01",
    title: "Catalogue 01",
    edition: "Development cover",
    media: {
      src: null,
      alt: "",
      placeholderLabel: "Approved catalogue cover 01",
      tone: "deep",
    },
  },
  {
    id: "catalogue-02",
    title: "Catalogue 02",
    edition: "Development cover",
    media: {
      src: null,
      alt: "",
      placeholderLabel: "Approved catalogue cover 02",
      tone: "clay",
    },
  },
  {
    id: "catalogue-03",
    title: "Catalogue 03",
    edition: "Development cover",
    media: {
      src: null,
      alt: "",
      placeholderLabel: "Approved catalogue cover 03",
      tone: "mineral",
    },
  },
] satisfies readonly CataloguePlaceholder[];
