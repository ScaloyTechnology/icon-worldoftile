import type { HomeMedia, MediaTone } from "@/types/home";
import type {
  Product,
  ProductCollection,
  ProductFilterGroup,
  ProductIntroTile,
  ProductsPageContent,
} from "@/types/products";

/*
 * Development fallback only. Names and colours are transcribed from client
 * filenames. Size is included only where it is present in the source path.
 * Finish, surface and application mappings remain empty until supplied.
 */
const media = (file: string, alt: string, tone: MediaTone = "stone"): HomeMedia => ({
  src: `/assets/products/${file}`,
  alt,
  placeholderLabel: "Client product visual",
  tone,
});

export const productsPageContent = {
  hero: {
    eyebrow: "The material index",
    titleLines: ["Products"],
    description: "Explore the current ICON material image library through colour, character and collection.",
    browseLabel: "Browse materials",
    media: media("austin-silver.webp", "Silver-grey tiled interior"),
  },
  featured: {
    eyebrow: "Featured collections",
    title: "Material stories, considered at scale.",
    description: "Selected studies drawn from the client-supplied visual archive.",
  },
  allCollections: {
    eyebrow: "Collections",
    title: "Find a material direction.",
    description: "Browse the current source groups while the final product catalogue is prepared.",
  },
  listing: {
    eyebrow: "Product library",
    title: "Explore the surfaces.",
    description: "Search, combine filters and share the exact view you create.",
  },
  browse: {
    eyebrow: "Refine",
    title: "Begin with what defines the space.",
    description: "Available filters reflect only verified information in the current source library.",
  },
  finalCta: {
    eyebrow: "Material conversations",
    title: "A surface becomes meaningful in context.",
    description: "Continue into applications or begin a project enquiry with ICON.",
    linkLabel: "Explore applications",
    href: "/applications",
  },
} satisfies ProductsPageContent;

type Seed = {
  name: string;
  slug: string;
  collectionId: string;
  file: string;
  alt: string;
  tone?: MediaTone;
  colors?: string[];
  looks?: string[];
  sizes?: string[];
  sourcePath: string;
};

const seeds: Seed[] = [
  { name: "Austin Silver", slug: "austin-silver", collectionId: "austin", file: "austin-silver.webp", alt: "Silver-grey tiled living space", colors: ["Silver"], looks: ["Stone"], sourcePath: "photos/AUSTIN_SILVER.jpg" },
  { name: "Travertino Honey + Decor", slug: "travertino-honey-decor", collectionId: "travertino", file: "travertino-honey-decor.webp", alt: "Honey-toned travertine and decorative tile interior", tone: "sand", colors: ["Honey"], looks: ["Stone", "Decor"], sourcePath: "photos/TRAVERTINO HONEY+DCEOR.jpg" },
  { name: "Star Nero", slug: "star-nero", collectionId: "star", file: "star-nero.webp", alt: "Dark tiled reception interior", tone: "deep", colors: ["Nero"], looks: ["Stone"], sourcePath: "photos/STAR_NERO.jpg" },
  { name: "Mystone Grey", slug: "mystone-grey", collectionId: "mystone", file: "mystone-grey.webp", alt: "Grey tiled interior detail", colors: ["Grey"], looks: ["Stone"], sourcePath: "photos/MYSTONE GREY.jpg" },
  { name: "Pecan White", slug: "pecan-white", collectionId: "200x1200", file: "pecan-white.webp", alt: "Pale wood-look tile surface", tone: "sand", colors: ["White"], looks: ["Wood"], sizes: ["200 x 1200"], sourcePath: "photos/200X1200-.../JPG/PECAN WHITE/PECAN WHITE (7).jpg" },
  { name: "Marmi Carrara", slug: "marmi-carrara", collectionId: "marmi", file: "marmi-carrara.webp", alt: "Carrara marble-look tiled interior", colors: ["White"], looks: ["Marble"], sourcePath: "photos/MARMI_CARRARA.jpg" },
  { name: "Fenix Crema", slug: "fenix-crema", collectionId: "editorial", file: "fenix-crema.webp", alt: "Cream tiled bedroom interior", tone: "sand", colors: ["Crema"], sourcePath: "photos/FENIX CREMA.jpg" },
  { name: "Mystone Nero + Grey", slug: "mystone-nero-grey", collectionId: "mystone", file: "mystone-nero-grey.webp", alt: "Nero and grey tiled interior", tone: "deep", colors: ["Nero", "Grey"], looks: ["Stone"], sourcePath: "photos/MYSTONE NERO + GREY.jpg" },
  { name: "Denim Blue + Royal Floral", slug: "denim-blue-royal-floral", collectionId: "editorial", file: "denim-blue-royal-floral.webp", alt: "Blue interior with floral tile panel", colors: ["Blue"], looks: ["Decor"], sourcePath: "photos/DENIM BLUE + ROYAL FLORAL.jpg" },
  { name: "Austin White", slug: "austin-white", collectionId: "austin", file: "austin-white.webp", alt: "White tiled architectural interior", colors: ["White"], looks: ["Stone"], sourcePath: "photos/AUSTIN_WHITE.jpg" },
  { name: "Travertino Rome + Decor", slug: "travertino-rome-decor", collectionId: "travertino", file: "travertino-rome-decor.webp", alt: "Rome travertine-look tiles with decor", tone: "sand", looks: ["Stone", "Decor"], sourcePath: "photos/TRAVERTINO ROME + DECOR.jpg" },
  { name: "Stars Bianco", slug: "stars-bianco", collectionId: "star", file: "stars-bianco.webp", alt: "Bianco tiled architectural interior", colors: ["Bianco"], sourcePath: "photos/STARS_BIANCO.jpg" },
  { name: "Marmi Travertine", slug: "marmi-travertine", collectionId: "marmi", file: "marmi-travertine.webp", alt: "Travertine-look boutique interior", tone: "sand", looks: ["Stone"], sourcePath: "photos/MARMI_TRAVERTINE.jpg" },
  { name: "Enigma Grey Capsul Punch", slug: "enigma-grey-capsul-punch", collectionId: "editorial", file: "enigma-grey-capsul.webp", alt: "Grey decorative tile courtyard", colors: ["Grey"], looks: ["Decor"], sourcePath: "photos/ENIGMA GREY  CAPSUL PUNCH.jpg" },
  { name: "Star Grey", slug: "star-grey", collectionId: "star", file: "star-grey.webp", alt: "Grey tiled interior", colors: ["Grey"], sourcePath: "photos/STAR_GREY.jpg" },
  { name: "Mystone Jaipur", slug: "mystone-jaipur", collectionId: "mystone", file: "mystone-jaipur.webp", alt: "Mystone Jaipur tiled interior", looks: ["Stone"], sourcePath: "photos/MYSTONE JAIPUR.jpg" },
  { name: "Cotto Gold", slug: "cotto-gold", collectionId: "editorial", file: "cotto-gold.webp", alt: "Gold-toned tiled cafe interior", tone: "clay", colors: ["Gold"], sourcePath: "photos/COTTO_GOLD.jpg" },
  { name: "Classic Black", slug: "classic-black", collectionId: "200x1200", file: "classic-black.webp", alt: "Dark wood-look tile surface", tone: "deep", colors: ["Black"], looks: ["Wood"], sizes: ["200 x 1200"], sourcePath: "photos/200X1200-.../JPG/CLASSIC BLACK/CLASSIC BLACK (9).jpg" },
];

export const products = seeds.map((seed, index): Product => ({
  id: `fallback-${seed.slug}`,
  name: seed.name,
  slug: seed.slug,
  collectionId: seed.collectionId,
  category: "Material study",
  primaryMedia: media(seed.file, seed.alt, seed.tone),
  gallery: [],
  sizes: seed.sizes ?? [],
  finishes: [],
  surfaces: [],
  thickness: null,
  colors: seed.colors ?? [],
  looks: seed.looks ?? [],
  applications: [],
  technicalSpecifications: [],
  relatedProductSlugs: [],
  technicalSheetHref: null,
  keywords: [seed.name, ...(seed.colors ?? []), ...(seed.looks ?? [])],
  sortOrder: index,
  source: "development-fallback",
  sourcePath: seed.sourcePath,
}));

const collectionSeeds = [
  ["austin", "Austin study"], ["marmi", "Marmi study"], ["travertino", "Travertino study"],
  ["mystone", "Mystone study"], ["star", "Star study"], ["editorial", "Editorial study"],
  ["200x1200", "200 x 1200 study"],
] as const;

export const productCollections = collectionSeeds.map(([id, name], index): ProductCollection => {
  const representative = products.find((product) => product.collectionId === id) ?? products[0]!;
  return {
    id,
    name,
    slug: id,
    description: "A provisional source group based on client filenames; awaiting the final catalogue structure.",
    media: representative.primaryMedia,
    featured: index < 5,
  };
});

export const productIntroTiles: readonly ProductIntroTile[] = ([
  ["intro-austin", "Austin Silver", "/media/material-austin-silver.webp"],
  ["intro-fenix", "Fenix Cream", "/media/material-fenix-cream.webp"],
  ["intro-travertine", "Travertino Honey", "/media/material-travertine-sand.webp"],
  ["intro-polar", "Polar Charcoal", "/media/material-polar-charcoal.webp"],
  ["intro-star", "Star Grey", "/media/material-star-grey.webp"],
  ["intro-pecan", "Pecan White", "/assets/products/pecan-white.webp"],
 ] as const).map(([id, label, src]): ProductIntroTile => ({
  id,
  label,
  finish: null,
  media: { src, alt: `${label} tile texture`, placeholderLabel: label, tone: "stone" },
}));

const options = (key: "sizes" | "colors" | "looks") =>
  [...new Set(products.flatMap((product) => product[key]))]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));

export const productFilterGroups = [
  { key: "sizes", label: "Size", param: "size", description: "Verified dimensions from source folders.", options: options("sizes") },
  { key: "finishes", label: "Finish", param: "finish", description: "Awaiting approved product data.", options: [] },
  { key: "surfaces", label: "Surface", param: "surface", description: "Awaiting approved product data.", options: [] },
  { key: "colors", label: "Colour", param: "colour", description: "Colour words transcribed from source filenames.", options: options("colors") },
  { key: "looks", label: "Look", param: "look", description: "Visual groupings for the development index.", options: options("looks") },
  { key: "applications", label: "Application", param: "application", description: "Awaiting approved product mappings.", options: [] },
] satisfies readonly ProductFilterGroup[];
