export const managedProductFilterTaxonomy = [
  {
    key: "applications",
    label: "Application",
    definitionName: "Application",
    definitionSlug: "product-application",
    kind: "USAGE",
    options: ["Flooring", "Elevation", "Parking", "Wall", "Subway", "Countertop"],
  },
  {
    key: "looks",
    label: "Look & feel",
    definitionName: "Look & feel",
    definitionSlug: "look-and-feel",
    kind: "LOOK",
    options: ["Marble", "Wood", "Fabric", "Plain", "Metallic", "Stone", "Concrete", "Decor"],
  },
  {
    key: "colors",
    label: "Colours",
    definitionName: "Colours",
    definitionSlug: "colours",
    kind: "COLOUR",
    options: ["White", "Beige", "Cream", "Pink", "Blue", "Green", "Orange", "Grey", "Brown", "Black"],
  },
  {
    key: "surfaces",
    label: "Surface",
    definitionName: "Surface",
    definitionSlug: "surface",
    kind: "SURFACE",
    options: ["Matt", "High gloss", "Carving", "Double digital", "GVT", "PGVT", "Fullbody", "Porcelain"],
  },
] as const;

export function productFilterValueSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
