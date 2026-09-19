import { clientAssets } from "@/content/assets";
import { companyProfile } from "@/content/company";
import type { MeetIconContent } from "@/types/meet-icon";

const journeyMedia = [clientAssets.austin, clientAssets.opal, clientAssets.travertino, clientAssets.cotto, clientAssets.mystone, clientAssets.star];
const technologyMedia = [clientAssets.travertino, clientAssets.mystone, clientAssets.cotto, clientAssets.denim, clientAssets.star, clientAssets.opal];

/* Website presentation of client-verified facts from the 13-page company profile. */
export const meetIconContent = {
  hero: {
    eyebrow: "ICON / Since 1987",
    titleLines: ["Meet", "ICON"],
    description: "A journey shaped by ceramic culture, design, technology and the pursuit of better surfaces.",
    media: clientAssets.austin,
  },
  intro: {
    eyebrow: companyProfile.story.title,
    statementLines: ["A product", "of choice", "and style."],
    description: companyProfile.story.description,
  },
  journey: {
    eyebrow: "History / Iconic journey",
    title: "A story in motion.",
    description: "Eleven milestones from the client-supplied company timeline, presented exactly in chronological order.",
    statusLabel: "Verified company profile / page 3",
    items: companyProfile.milestones.map((item, index) => ({
      id: `journey-${item.year}`,
      year: item.year,
      label: `Milestone ${String(index + 1).padStart(2, "0")}`,
      title: item.name,
      description: item.name,
      media: journeyMedia[index % journeyMedia.length]!,
      order: index + 1,
      published: true,
    })),
  },
  manufacturing: {
    eyebrow: "Manufacturing / Infrastructure",
    title: "Built around process.",
    description: companyProfile.infrastructure.description,
    statusLabel: "90,000 sq. mtr. per day production capacity",
    frames: [
      { id: "manufacturing-material", label: "01 / Material", title: "Raw material", description: "The production journey begins with incoming raw material, inspection and controlled preparation.", media: clientAssets.travertino },
      { id: "manufacturing-process", label: "02 / Process", title: "Form and fire", description: "Pressing, drying, glazing, printing and heating translate material into engineered surfaces.", media: clientAssets.star },
      { id: "manufacturing-finish", label: "03 / Finish", title: "Finish and dispatch", description: "Polishing, sizing, sorting and packing complete the production flow before warehousing and dispatch.", media: clientAssets.mystone },
    ],
    process: companyProfile.manufacturingProcess,
    infrastructure: companyProfile.infrastructure,
  },
  technology: {
    eyebrow: "Technology",
    title: "Always step ahead.",
    description: "A robust, controlled, flexible and customizable production process brings together advanced ceramic technologies for aesthetic excellence, quality and reliability.",
    media: clientAssets.travertino,
    steps: companyProfile.technologies.map((item, index) => ({
      id: `technology-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: item.role,
      title: item.name,
      description: item.description,
      media: technologyMedia[index]!,
      order: index + 1,
      published: true,
    })),
    machineryPartners: companyProfile.technologies.map((item, index) => ({ id: `partner-${index + 1}`, name: item.name, description: item.role, logo: null, order: index + 1, published: true })),
    machineryStatusLabel: "Verified technology partners",
  },
  sustainability: {
    eyebrow: "Sustainability",
    title: "Progress, with a lighter footprint.",
    items: companyProfile.sustainability,
    media: clientAssets.outdoor,
  },
  quality: {
    eyebrow: "Quality control",
    title: "Quality at every stage.",
    description: "Statistical and comprehensive quality-management systems follow global standards at every stage, with process-wise checkpoints combining manual and automatic control.",
    items: companyProfile.qualityControls,
    marks: companyProfile.certificationMarks,
    media: clientAssets.star,
  },
  innovation: {
    eyebrow: "Surface innovation",
    title: companyProfile.innovation.title,
    description: companyProfile.innovation.description,
    marks: companyProfile.innovation.marks,
    natureTitle: companyProfile.natureInspired.title,
    natureDescription: companyProfile.natureInspired.description,
    media: clientAssets.opal,
  },
  values: {
    eyebrow: "Brand values",
    title: "Character, made visible.",
    description: "ICON's documented personality and values guide how the brand communicates, creates and earns trust.",
    items: [
      { id: "sophistication", label: "01", title: "Sophistication", description: "A refined, charming expression of European luxury and craftsmanship.", media: journeyMedia[0]! },
      { id: "competence", label: "02", title: "Competence", description: "Professionalism, quality control, range and innovation communicated with confidence.", media: journeyMedia[1]! },
      { id: "sincerity", label: "03", title: "Sincerity", description: "Honest, transparent and approachable communication, supported by ethical practice.", media: journeyMedia[2]! },
      { id: "uncompromised-quality", label: "04", title: "Uncompromised quality", description: "A commitment to standards that go beyond the expected, with attention to product perfection.", media: journeyMedia[0]! },
      { id: "sustainability", label: "05", title: "Sustainability", description: "Environmental responsibility, reduced pollution and recycled packaging remain part of the brand's stated direction.", media: journeyMedia[1]! },
    ],
  },
  specifications: {
    eyebrow: "Surface vocabulary",
    title: "20 surfaces & many more.",
    surfaces: companyProfile.surfaces,
    sizes: companyProfile.sizes,
  },
  markets: {
    eyebrow: "Markets / Domestic & export",
    title: "One origin. More than 60 countries.",
    statement: "From India to a global network of trusted markets.",
    description: "ICON supplies high-quality tiles across Asia, the Middle East, Europe, Africa, the Americas and Oceania, with a client-verified list of international markets.",
    statusLabel: `${companyProfile.markets.length} markets listed in the company profile`,
    media: clientAssets.office,
    records: companyProfile.markets.map((country, index) => ({ id: `market-${index + 1}`, name: country, country, region: "Global", type: country === "India" ? "DOMESTIC" as const : "EXPORT" as const, coordinates: null, description: "Listed market in the client company profile.", order: index + 1, published: true })),
  },
  certifications: {
    eyebrow: "Certifications",
    title: "Evidence belongs in view.",
    description: "Certification marks visible in the verified company profile.",
    items: companyProfile.certificationMarks.map((mark, index) => ({ id: `certification-${index + 1}`, label: mark, supportingText: "Shown in the client company profile." })),
  },
  suppliers: {
    eyebrow: "Our suppliers",
    title: "Material partnerships.",
    items: companyProfile.suppliers,
  },
  research: {
    eyebrow: "R&D / Research & development",
    title: "Engineered for what comes next.",
    statement: "Design development, process knowledge and material curiosity work together.",
    description: "ICON's in-house team brings together world-class design development, R&D and skilled quality expertise.",
    details: ["15+ design, R&D and quality team", "Advanced digital surface technologies", "A growing portfolio of 1500+ tile designs"],
    media: clientAssets.denim,
  },
  finalCta: {
    eyebrow: "Continue the journey",
    title: "Explore ICON surfaces.",
    description: "Move from the company story into ICON's product world.",
    linkLabel: "Explore products",
    href: "/products",
    media: clientAssets.cotto,
  },
} satisfies MeetIconContent;
