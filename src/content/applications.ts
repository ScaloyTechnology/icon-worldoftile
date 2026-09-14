import type { ApplicationContent, ApplicationMedia } from "@/types/applications";

const media = (
  file: string,
  source: string,
  alt: string,
  tone: ApplicationMedia["tone"],
  position = "50% 50%",
): ApplicationMedia => ({
  src: `/assets/applications/${file}`,
  sourcePath: `photos/${source}`,
  alt,
  placeholderLabel: "Client architectural visual",
  tone,
  position,
});

export const applicationsHero = {
  eyebrow: "Applications / Industries",
  title: "Surfaces in context.",
  description: "Follow material from a close surface study into the architectural environments it can shape.",
  media: media(
    "hero-fenix-taupe.webp",
    "FENIX_TAUPE.jpg",
    "Light-filled residential interior with warm tiled floors and walls",
    "sand",
    "54% 50%",
  ),
} as const;

export const fallbackApplications: readonly ApplicationContent[] = [
  {
    id: "application-residential",
    index: "01",
    name: "Residential",
    slug: "residential",
    shortDescription: "Explore material through the rooms of everyday life, from calm living areas to kitchens and bathrooms.",
    heroMedia: media("residential-enigma-crema.webp", "ENIGMA CREMA CAPSUL PUNCH.jpg", "Calm living room framed by pale architectural tile surfaces", "stone", "52% 50%"),
    galleryMedia: [media("residential-cotto-red.webp", "COTTO RED PREVIEW (1).jpg", "Bathroom interior composed with warm red and textured tile surfaces", "clay", "50% 50%")],
    transition: "split",
    order: 0,
  },
  {
    id: "application-commercial",
    index: "02",
    name: "Commercial",
    slug: "commercial",
    shortDescription: "See how scale, rhythm and tone can frame shared interiors, circulation and public-facing spaces.",
    heroMedia: media("commercial-everest-grey.webp", "EVEREST GREY.jpg", "Contemporary public interior with a broad grey tiled floor", "stone", "50% 58%"),
    galleryMedia: [media("commercial-polar-lobby.webp", "POLAR SAND+CHARCOAL.jpg", "Lift lobby with contrasting sand and charcoal tile surfaces", "deep", "54% 50%")],
    transition: "mask",
    order: 1,
  },
  {
    id: "application-hospitality",
    index: "03",
    name: "Hospitality",
    slug: "hospitality",
    shortDescription: "Material, light and atmosphere meet across dining, lounge and reception-inspired settings.",
    heroMedia: media("hospitality-serena-graphite.webp", "SERENA GRAPHITE.jpg", "Atmospheric restaurant interior with graphite tiled walls and floor", "deep", "50% 50%"),
    galleryMedia: [media("hospitality-cotto-gold.webp", "COTTO GOLD PREVIEW.jpg", "Warm cafe interior shaped by Cotto Gold tile surfaces", "clay", "48% 50%")],
    transition: "drift",
    order: 2,
  },
  {
    id: "application-retail",
    index: "04",
    name: "Retail",
    slug: "retail",
    shortDescription: "Discover graphic surfaces within display walls, open floors and composed customer-facing interiors.",
    heroMedia: media("retail-illusion-verde.webp", "ILLUSION_BLANCO&ILLUSION_VERDE.jpg", "Minimal retail showroom with pale wall and floor surfaces", "mineral", "50% 46%"),
    galleryMedia: [media("retail-marmi-travertine.webp", "MARMI_TRAVERTINE.jpg", "Boutique interior with warm travertine-look floor and walls", "sand", "50% 55%")],
    transition: "shift",
    order: 3,
  },
  {
    id: "application-office",
    index: "05",
    name: "Office",
    slug: "office",
    shortDescription: "Explore restrained material directions through reception, meeting and common-space environments.",
    heroMedia: media("office-everest-graphite.webp", "EVEREST GRPHITE.jpg", "Refined reception and waiting area with graphite tiled flooring", "stone", "50% 58%"),
    galleryMedia: [media("office-stars-bianco.webp", "STARS_BIANCO.jpg", "Bright reception desk against a white dimensional tile wall", "stone", "54% 50%")],
    transition: "grid",
    order: 4,
  },
  {
    id: "application-outdoor",
    index: "06",
    name: "Outdoor",
    slug: "outdoor",
    shortDescription: "Move beyond the interior into courtyards, terraces and open-air architectural settings.",
    heroMedia: media("outdoor-kandla-grey.webp", "KANDLA_GREY.jpg", "Poolside deck composed with linear grey architectural tiles", "mineral", "50% 52%"),
    galleryMedia: [media("outdoor-enigma-courtyard.webp", "ENIGMA GREY  CAPSUL PUNCH.jpg", "Open courtyard lounge enclosed by pale tiled walls", "stone", "50% 50%")],
    transition: "pullout",
    order: 5,
  },
];

export const documentedUseCaseOrder = [
  "Flooring", "Elevation", "Parking", "Wall", "Subway", "Countertop",
  "Bathroom", "Bedroom", "Kitchen", "Balcony", "Outdoor", "Commercial", "Stairs",
] as const;
