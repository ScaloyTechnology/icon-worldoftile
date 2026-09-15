import type { ProjectGalleryItem, ProjectMedia, ProjectSummary, ProjectsPageData } from "@/types/projects";

const sourceRoot = "photos/drive-download-20260910T214746Z-1-001";

function media(
  file: string,
  source: string,
  alt: string,
  width: number,
  height: number,
  position = "50% 50%",
): ProjectMedia {
  return {
    src: `/assets/projects/${file}`,
    sourcePath: `${sourceRoot}/${source}`,
    alt,
    width,
    height,
    position,
  };
}

const heroMedia = media(
  "hero-enigma-line-stone-mist.webp",
  "ENIGMA_LINE_STONE_MIST.jpg",
  "Bedroom composition with warm timber joinery, a pale tiled wall and filtered window light",
  2200,
  1467,
  "54% 50%",
);

const featuredPrimary = media(
  "featured-eternity-mocha-mist.webp",
  "ETERNITY MOCHA + ETERNITY MIST.jpg",
  "Dining space composed with muted mocha surfaces, sculptural furniture and garden light",
  2000,
  1414,
  "50% 48%",
);

const featuredSecondary = media(
  "featured-aqua-stone-graphite.webp",
  "AQUA_STONE_GRAPHITE.jpg",
  "Graphite wall surface beside a compact timber console and pendant light",
  1100,
  1534,
  "50% 44%",
);

const developmentProjects: readonly ProjectSummary[] = [
  {
    id: "development-feature-01",
    slug: "development-case-study",
    index: "01",
    title: "Development case study",
    shortDescription: "A supplied architectural visual establishes the case-study format while the verified project name, location and credits await approval.",
    category: "Interior preview",
    location: null,
    heroMedia: featuredPrimary,
    secondaryMedia: featuredSecondary,
    products: [],
    layout: "wide",
  },
  {
    id: "development-study-01",
    slug: "space-study-01",
    index: "02",
    title: "Space study 01",
    shortDescription: "Development preview using a supplied client architectural visual.",
    category: "Interior",
    location: null,
    heroMedia: media("study-artica-beige.webp", "ARTICA BEIGE.jpg", "Low bedroom view with pale stone surfaces and patterned timber bed frames", 1600, 1067, "50% 54%"),
    products: [],
    layout: "landscape",
  },
  {
    id: "development-study-02",
    slug: "space-study-02",
    index: "03",
    title: "Space study 02",
    shortDescription: "Development preview using a supplied client architectural visual.",
    category: "Bathing spaces",
    location: null,
    heroMedia: media("study-cotto-olive.webp", "COTTO OLIVE PREVIEW.jpg", "Bathing space with olive-toned surfaces, translucent glass and a stone basin", 1200, 1200),
    products: [],
    layout: "portrait",
  },
  {
    id: "development-study-03",
    slug: "space-study-03",
    index: "04",
    title: "Space study 03",
    shortDescription: "Development preview using a supplied client architectural visual.",
    category: "Interior",
    location: null,
    heroMedia: media("study-avenue-grey.webp", "Avenue grey.jpg", "Linear kitchen and dining interior with pale flooring and dark stone cabinetry", 1600, 1067, "50% 50%"),
    products: [],
    layout: "landscape",
  },
  {
    id: "development-study-04",
    slug: "space-study-04",
    index: "05",
    title: "Space study 04",
    shortDescription: "Development preview using a supplied client architectural visual.",
    category: "Bathing spaces",
    location: null,
    heroMedia: media("study-cotto-red-aurum.webp", "COTTO RED + AURUM TACO.jpg", "Warm red bathroom composition with patterned detail and black architectural frame", 1600, 1067, "50% 50%"),
    products: [],
    layout: "wide",
  },
  {
    id: "development-study-05",
    slug: "space-study-05",
    index: "06",
    title: "Space study 05",
    shortDescription: "Development preview using a supplied client architectural visual.",
    category: "Bathing spaces",
    location: null,
    heroMedia: media("study-plutonic-teal.webp", "PLUTONIC TEAL GRANDE +AQUA STONE SILVER.jpg", "Bathroom interior opening to greenery with teal and mineral wall surfaces", 1600, 1200, "50% 50%"),
    products: [],
    layout: "portrait",
  },
  {
    id: "development-study-06",
    slug: "space-study-06",
    index: "07",
    title: "Space study 06",
    shortDescription: "Development preview using a supplied client architectural visual.",
    category: "Open-air",
    location: null,
    heroMedia: media("study-sunglow-heritage.webp", "SUNGLOW YELLOW + HERITAGE FLORAL BASE.jpg", "Open-air bistro setting with warm paving, patterned border and planting", 1800, 1100, "50% 54%"),
    products: [],
    layout: "landscape",
  },
];

const developmentGallery: readonly ProjectGalleryItem[] = [
  { id: "gallery-01", label: "Interior crop / 01", media: media("gallery-artica-ivory.webp", "ARTICA IVORY.jpg", "Close architectural view of an ivory floor beside timber dining furniture", 1300, 1300, "50% 50%") },
  { id: "gallery-02", label: "Material crop / 02", media: media("gallery-artica-silver-graphite.webp", "ARTICA SILVER+GRAPHITE.jpg", "Graphic bathroom composition pairing pale wall surfaces with dark flooring", 1600, 1118, "50% 52%") },
  { id: "gallery-03", label: "Bathing space / 03", media: media("gallery-cotto-sand.webp", "Cotto sand final_.jpg", "Sand-toned bathroom with twin basins, arched mirrors and a freestanding bath", 1500, 1071, "50% 50%") },
  { id: "gallery-04", label: "Interior crop / 04", media: media("gallery-everest-taupe.webp", "EVEREST TAUPE FINAL.jpg", "Quiet bedroom composition with taupe wall and floor surfaces", 1600, 1067, "54% 50%") },
  { id: "gallery-05", label: "Surface crop / 05", media: media("gallery-polar-gris.webp", "POLAR GRIS.jpg", "Overhead dining vignette on a soft grey tiled floor", 1400, 1141, "50% 50%") },
];

const developmentStory: readonly ProjectGalleryItem[] = [
  { id: "story-01", label: "Colour / 01", media: media("story-forest-heritage.webp", "FOREST GREEN+YELLOW+HERITAGE SQUARE BASE.jpg", "Green retail counter fronted with a warm geometric tile pattern", 1300, 1013, "50% 54%") },
  { id: "story-02", label: "Composition / 02", media: media("story-polar-pearl-charcoal.webp", "POLAR PEARL+CHARCOAL.jpg", "Pearl wall plane paired with charcoal floor surfaces in a compact interior", 1400, 1094, "50% 52%") },
  { id: "story-03", label: "Detail / 03", media: media("story-star-mocha.webp", "STAR_MOCHA.jpg", "Mocha-toned bathroom with a ribbed basin volume and softly lit niches", 1500, 1000, "50% 50%") },
];

export const projectsFallback = {
  source: "development-fallback",
  hero: {
    eyebrow: "Projects / Atlas 01",
    title: ["Spaces", "in context."],
    description: "An editorial index of supplied architectural visualisations, prepared for verified project stories.",
    media: heroMedia,
  },
  projects: developmentProjects,
  featuredProjectId: developmentProjects[0]?.id ?? "development-feature-01",
  gallery: developmentGallery,
  story: developmentStory,
  locations: [],
} satisfies Omit<ProjectsPageData, "categories">;
