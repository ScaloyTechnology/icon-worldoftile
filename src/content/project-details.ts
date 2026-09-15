import { projectsFallback } from "@/content/projects";
import type { ProjectDetailData } from "@/types/project-detail";
import type { ProjectGalleryItem, ProjectMedia } from "@/types/projects";

const sourceRoot = "photos/200X1200-20260910T201837Z-1-001/200X1200/PREVIEW";

function media(file: string, source: string, alt: string, width: number, height: number, position = "50% 50%"): ProjectMedia {
  return { src: `/assets/projects/${file}`, sourcePath: `${sourceRoot}/${source}`, alt, width, height, position };
}

const detailMedia: readonly ProjectMedia[] = [
  media("detail-haramain-01.webp", "01 HARAMAIN.jpg", "Contemporary kitchen with charcoal cabinetry and pale timber-look floor surfaces", 2000, 1791, "50% 52%"),
  media("detail-haramain-017.webp", "017 HARAMAIN.jpg", "Quiet entrance interior with warm timber-look floor planks and a low storage bench", 1800, 1800, "50% 50%"),
  media("detail-haramain-019.webp", "019 HARAMAIN.jpg", "Restaurant interior with timber-look flooring, woven pendants and upholstered seating", 2000, 1760, "50% 50%"),
  media("detail-haramain-020.webp", "020 HARAMAIN.jpg", "Green kitchen composition above a pale timber-look tiled floor", 1800, 1800, "50% 50%"),
  media("detail-haramain-08.webp", "08 HARAMAIN.jpg", "Sheltered terrace with pale timber-look flooring and a planted garden edge", 2000, 1333, "50% 50%"),
  media("detail-18001-final.webp", "18001_FINAL.jpg", "Dark kitchen island paired with linear timber-look floor and wall surfaces", 2000, 1112, "50% 48%"),
];

function galleryFor(projectIndex: number): readonly ProjectGalleryItem[] {
  const rotated = [...detailMedia.slice(projectIndex % detailMedia.length), ...detailMedia.slice(0, projectIndex % detailMedia.length)];
  return rotated.slice(0, 6).map((item, index) => ({
    id: `development-detail-${projectIndex + 1}-${index + 1}`,
    label: `Supplied architectural visual / ${String(index + 1).padStart(2, "0")}`,
    media: item,
  }));
}

export function getFallbackProjectDetail(slug: string): ProjectDetailData | null {
  const projectIndex = projectsFallback.projects.findIndex((item) => item.slug === slug);
  const project = projectsFallback.projects[projectIndex];
  if (!project) return null;

  return {
    source: "development-fallback",
    project,
    introductionHeading: "A framework for the story to come.",
    introduction: "This case-study layout uses supplied architectural visuals while verified project narrative, credits, location and product relationships await approved records. It is intentionally presented as development material, not as a completed or attributed built project.",
    facts: [],
    gallery: galleryFor(projectIndex),
    galleryNote: "The images below are supplied architectural visualisations used to demonstrate the gallery composition. They are not asserted to document one verified project.",
    products: [],
    relatedCollections: [],
    relatedProjects: [],
    seo: {
      description: "Preview the ICON architectural project-detail experience while verified project information awaits publication.",
      noIndex: true,
    },
  };
}

export function getFallbackProjectSlugs() {
  return projectsFallback.projects.map((project) => ({ slug: project.slug }));
}
