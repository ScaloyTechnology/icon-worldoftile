/*
 * Verified client data.
 * Company-profile facts: docs/Company Profile_Updated.pdf (pages noted below).
 * Contact, unit and social data: final client brief dated 2026-09-13; this
 * intentionally overrides the older contact panel on profile page 12.
 */

export const companyContact = {
  domestic: {
    label: "Domestic inquiry",
    phone: "+91 82380 49090",
    phoneHref: "tel:+918238049090",
    email: "inquiry@iconworldoftile.com",
    emailHref: "mailto:inquiry@iconworldoftile.com",
  },
  export: {
    label: "Export inquiry",
    phone: "+91 87587 39191",
    phoneHref: "tel:+918758739191",
    email: "export@iconworldoftile.com",
    emailHref: "mailto:export@iconworldoftile.com",
  },
  units: [
    {
      id: "icon-granito",
      number: "01",
      name: "ICON GRANITO PVT. LTD.",
      addressLines: ["Survey No. 8/14,", "Ghuntu Road,", "Mahendra Nagar,", "Morbi - 363 642,", "Gujarat,", "INDIA"],
      mapUrl: "https://maps.app.goo.gl/Fuu8jivGw3AGs9Jx9",
    },
    {
      id: "acecon-vitrified",
      number: "02",
      name: "ACECON VITRIFIED PVT. LTD.",
      addressLines: ["8-A National Highway,", "Matel Road,", "Matel,", "Ta. Wankaner - 363 621,", "Dist. Morbi,", "Gujarat,", "INDIA"],
      mapUrl: "https://maps.app.goo.gl/pTgzJYJWr4nMnpAH9",
    },
    {
      id: "duracon-vitrified",
      number: "03",
      name: "DURACON VITRIFIED PVT. LTD.",
      addressLines: ["8-A National Highway,", "Sartanpar Road,", "Tal. Wankaner - 363 621,", "Dist. Morbi,", "Gujarat,", "INDIA"],
      mapUrl: "https://maps.app.goo.gl/H4nwNKaFCBqPVU7p7",
    },
  ],
  socials: [
    { label: "Instagram", href: "https://www.instagram.com/iconworldoftile/?hl=en" },
    { label: "Facebook", href: "https://www.facebook.com/pages/Icon%20Granito%20Pvt%20Ltd/130746197621918/" },
    { label: "LinkedIn", href: "https://in.linkedin.com/company/iconworldoftile" },
  ],
} as const;

export const companyProfile = {
  story: {
    sourcePage: 2,
    title: "The story of 38 years",
    statement: "We are a product of choice and style.",
    description: "Our journey in this industry is a passion for exploring unmatched product selection and the reasons behind the best choice of a large market.",
  },
  milestones: [
    { year: "1987", name: "SANGHDOOT INDUSTRIES" },
    { year: "1990", name: "RAJDOOT CERAMIC INDUSTRIES" },
    { year: "1995", name: "DHUVA - MORBI / EVERSHINE CERA PVT. LTD." },
    { year: "2002", name: "LALPAR - MORBI / ICON CERAMIC LIMITED" },
    { year: "2007", name: "ICON GRANITO PVT. LTD." },
    { year: "2009", name: "AVLON CERAMIC PVT. LTD." },
    { year: "2011", name: "DURACON VITRIFIED PVT. LTD." },
    { year: "2015", name: "ERACON VITRIFIED PVT. LTD." },
    { year: "2017", name: "ACECON VITRIFIED PVT. LTD." },
    { year: "2025", name: "COMMENCEMENT OF SLAB PRODUCTION" },
    { year: "2026", name: "ICON ADHESIVE" },
  ],
  pillars: [
    { title: "IDEATE INNOVATE", description: "Where imagination begins. Crafting concepts shaped by nature, refined by design." },
    { title: "INSPIRE", description: "Advancing surfaces through new textures, techniques, and thinking. Innovation that transforms possibilities into products." },
    { title: "RISE WITH INTEGRITY", description: "Setting benchmarks for the industry with pioneering creations. Designs that elevate spaces and spark new ideas." },
  ],
  sustainability: [
    {
      title: "Natural Gas Powered Kiln for Reduced Emissions",
      description: "Advanced kilns powered by natural gas reduce harmful emissions compared with conventional fuels while maintaining precise temperature control for consistent tile quality and durability.",
    },
    {
      title: "Solar Energy Integration in Production",
      description: "Solar power supports approximately 33% of total production energy requirements, reducing dependence on non-renewable resources and lowering carbon emissions.",
      metric: "Approximately 33%",
    },
  ],
  infrastructure: {
    description: "At ICON, our modernized and well-furnished infrastructure unit supports our team-mates in the production process of our complete variety of qualitative tile products within an assured span of time.",
    statements: ["State of the art infrastructure", "One of the largest plant in India", "Network in more than 60 countries", "Fastest growing ceramic brand in India"],
    stats: [
      { value: "1500+", label: "Tiles Design", sourcePage: 5 },
      { value: "30+", label: "Year experience", sourcePage: 5 },
      { value: "300+", label: "Dealers Worldwide", sourcePage: 5 },
      { value: "90,000 sq. mtr. per day", label: "Production Capacity", sourcePage: 5 },
      { value: "15+", label: "World Class Design Developer & R & D Highly Quality & Skilled In-house Team", sourcePage: 5 },
    ],
  },
  technologies: [
    { name: "SACMI", role: "Forming & firing", description: "We utilize SACMI presses and kilns for forming and firing our tiles, ensuring high-density and strength." },
    { name: "APPEL", role: "Quality analysis", description: "We employ advanced APPEL planar machines for sophisticated tile quality analysis and precise sorting." },
    { name: "LB", role: "Color body technology", description: "Our color body technology uses LB color machines to create consistent and deep colors throughout the tile." },
    { name: "SYSTEM CERAMICS", role: "Digital decoration", description: "We use SYSTEM CERAMICS' high-DPI printing digital machines for accurate and vibrant tile decoration." },
    { name: "CONTINUA+", role: "Continuous forming", description: "We integrate the latest CONTINUA+ press technology for continuous forming and production efficiency." },
    { name: "CREAVISION", role: "Double digital synchronizing", description: "We leverage CREAVISION for double digital synchronizing to optimize flow and elevate printing quality." },
  ],
  qualityControls: [
    "Creavision & barcode technology",
    "Continua plus",
    "High dpi printing digital machine",
    "Proper infrastructure to produce technical vitrified tile",
    "Stringent Quality norms as per european standards",
    "Audited certifications",
  ],
  certificationMarks: ["CE", "ISO 9001:2015", "UKCA", "IS 15622 / CML-7900142414"],
  innovation: {
    title: "First in industry",
    description: "Double Digital Technology powered by System and Creavision creates a unique texture for every individual slab. Creavision tracking aligns design and texture, while selected accents and a premium Dry Granilla top coat give Ice Sparkle tiles a high-gloss, mirror finish.",
    marks: ["Double Sync", "iSparkle", "impressions"],
  },
  natureInspired: {
    title: "Nature inspired",
    description: "Nature is our greatest source of inspiration. We study marble, stone, wood and concrete, then use advanced digital and surface technologies to capture their depth, realism and detail in engineered surfaces.",
  },
  manufacturingProcess: ["Incoming Raw Material", "Raw Material Inspection", "Godown", "Ball Mill Mixing", "Slurry", "Sprey Dryer", "Pressing", "Dryer", "Glazing", "Printing", "Heating", "Polishing", "Sizing", "Sorting", "Packing", "Ware House", "Dispatch"],
  surfaces: ["MATT", "POLISHED", "HIGH GLOSS", "SILK", "HONED", "CRAVING", "POLISHED GLIMMER", "METALLIC", "R & R11", "I SPARKLE", "I SHAPE+", "I SHEEN", "PIXEL", "I SHAPE GLITTER", "GHR", "GRANILLA", "I GLAM", "I GRAFFITI", "MAGIC", "I LUXURY"],
  sizes: ["80 × 320 cm", "80 × 300 cm", "60 × 120 cm", "45 × 90 cm", "60 × 60 cm", "80 × 240 cm", "20 × 20 cm", "30 × 30 cm", "80 × 160 cm", "80 × 80 cm", "30 × 60 cm", "120 × 240 cm", "20 × 120 cm", "120 × 180 cm", "120 × 280 cm", "120 × 120 cm", "29.8 × 60 cm", "29.8 × 29.8 cm"],
  markets: [
    "Australia", "Bahrain", "Barbados", "Belarus", "Belgium", "Bolivia", "Bosnia", "Brazil", "Bulgaria", "Cameroun", "Canada", "Chile", "Colombia", "Croatia", "Cyprus", "Dominican Republic",
    "Ecuador", "El Salvador", "France", "Georgia", "Germany", "Greece", "Guatemala", "Honduras", "India", "Iraq", "Ireland", "Italy", "Jamaica", "Kazakhstan", "Kenya", "Kosovo",
    "Kuwait", "Lebanon", "Leicestershire", "Malta", "Mauritius", "Mexico", "Moldova", "Morocco", "Netherlands", "New Zealand", "Nepal", "Oman", "Peru", "Poland", "Puerto Rico", "Qatar",
    "Romania", "Russia", "Seychelles", "South Korea", "Spain", "Taiwan", "Thailand", "Trinidad And Tobago", "Turkey", "UAE", "UK", "Uruguay", "USA", "Uzbekistan", "Venezuela", "Vietnam",
  ],
  suppliers: ["Vidres India", "Colorobbia", "Torrecid", "Esmalglass-Itaca Grupo", "Icer Italian Ceramic Surfaces", "Zschimmer & Schwarz"],
} as const;
