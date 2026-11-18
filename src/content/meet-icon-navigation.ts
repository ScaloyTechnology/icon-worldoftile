type MeetIconSection = Readonly<{
  id: string;
  label: string;
  children?: readonly Readonly<{ id: string; label: string }>[];
}>;

export const meetIconSections: readonly MeetIconSection[] = [
  { id: "iconic-journey", label: "The Iconic Journey" },
  { id: "our-presence", label: "Our Presence" },
  { id: "manufacturing-infrastructure", label: "Manufacturing & Infrastructure", children: [
    { id: "technology", label: "Technology" },
    { id: "sustainability", label: "Sustainability" },
    { id: "quality-control", label: "Quality Control" },
    { id: "how-tiles-are-made", label: "How Tiles Are Made" },
    { id: "certifications", label: "Certifications" },
    { id: "our-suppliers", label: "Our Suppliers" },
  ] },
  { id: "research-and-innovation", label: "R&D and Innovation", children: [
    { id: "surface-vocabulary", label: "Surface Vocabulary" },
  ] },
];

export const meetIconAnchorIds = meetIconSections.flatMap(section => [
  section.id, ...(section.children?.map(child => child.id) ?? []),
]);

export const meetIconUpcomingPages = ["CSR", "Director’s Corner"] as const;
