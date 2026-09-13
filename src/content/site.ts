/** Centralized public-site copy. */
export const siteContent = {
  name: "ICON",
  descriptor: "WORLD OF TILE",
  previewNotice: "Client-verified company profile · Product catalogue continues to evolve.",
  hero: { eyebrow: "A dialogue between material & space", lines: ["Spaces, with", "character."], cta: "Explore more" },
  discover: { label: "Discover ICON", heading: "Every space begins\nwith a surface.", body: "Explore the interplay of texture, tone and light. A world of tile, seen through the spaces it can inspire.", note: "Discover 38 years of company milestones, material thinking and manufacturing progress." },
  collections: [
    { name: "The stone edit", subtitle: "Texture. Light. A quieter expression.", media: "stone", filter: "stone", label: "01 / STONE-LOOK STUDY" },
    { name: "A warmer perspective", subtitle: "A study in wood-inspired surfaces.", media: "wood", filter: "wood", label: "02 / WOOD-LOOK STUDY" },
  ],
  surfaces: [
    { name: "Matt", slug: "matt" }, { name: "High gloss", slug: "high-gloss" }, { name: "Carving", slug: "carving" },
  ],
  applications: ["Residential", "Commercial", "Hospitality", "Retail", "Office", "Outdoor"],
  certifications: { title: "Confidence, in every detail.", body: "Certification marks from the verified company profile are presented on Meet ICON; supporting documents can be added when supplied.", status: "Verified profile marks" },
  catalogues: { title: "A world of materials.\nA closer look.", body: "The ICON publication library will bring collections, surfaces and technical details together.", status: "New catalogues are being prepared." },
  enquiry: { eyebrow: "Let’s make room for your ideas", title: "Have a space\nin mind?", cta: "Talk to ICON" },
};

export const navigation = [
  { label: "Meet ICON", href: "/meet-icon" },
  { label: "Products", href: "/products" },
  { label: "Applications", href: "/applications" },
  { label: "Projects", href: "/projects" },
  { label: "Catalogues", href: "/catalogues" },
];

export const routeContent: Record<string, { title: string; eyebrow: string; description: string; pending: string[] }> = {
  "meet-icon": { title: "Meet ICON.", eyebrow: "Our world", description: "The verified story, milestones, processes and global reach behind ICON.", pending: ["Downloadable certification documents", "Additional approved plant photography"] },
  products: { title: "A product world, structured for discovery.", eyebrow: "Products", description: "Browse the evolving ICON product library through collections and material filters.", pending: ["Complete product master data", "Additional technical documents"] },
  catalogues: { title: "A world of materials.\nA closer look.", eyebrow: "Catalogues", description: "A managed library for current product publications.", pending: ["Approved catalogue PDF files"] },
  "technical-specs": { title: "Technical clarity.", eyebrow: "Technical specs", description: "A structured technical resource for surfaces, sizes and product documentation.", pending: ["Product technical sheets", "Downloadable certificate files"] },
  applications: { title: "Made for every setting.", eyebrow: "Applications", description: "Application-led discovery across residential, commercial and outdoor spaces.", pending: ["Approved application case studies"] },
  projects: { title: "Surfaces, in context.", eyebrow: "Projects", description: "A project library connecting spaces and the products used within them.", pending: ["Approved project stories and credits"] },
  contact: { title: "Let’s start a conversation.", eyebrow: "Contact ICON", description: "Domestic and export contacts, manufacturing-unit addresses and verified plant-location links.", pending: ["Enquiry form workflow and privacy notice"] },
};
