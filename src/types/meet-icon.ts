import type { CertificationPlaceholder, HomeMedia } from "@/types/home";

export type JourneyItem = Readonly<{
  id: string; year: string | null; label: string; title: string; description: string;
  media: HomeMedia; order: number; published: boolean;
}>;

export type BrandValue = Readonly<{
  id: string; label: string; title: string; description: string; media: HomeMedia;
}>;

export type TechnologyStep = Readonly<{
  id: string; label: string; title: string; description: string; media: HomeMedia;
  order: number; published: boolean;
}>;

export type ManufacturingFrame = Readonly<{
  id: string; label: string; title: string; description: string; media: HomeMedia;
}>;

export type MachineryPartner = Readonly<{
  id: string; name: string; description: string; logo: HomeMedia | null;
  order: number; published: boolean;
}>;

export type MarketRecord = Readonly<{
  id: string; name: string; country: string; region: string; type: "DOMESTIC" | "EXPORT";
  coordinates: readonly [number, number] | null; description: string; order: number; published: boolean;
}>;

export type MeetIconContent = Readonly<{
  hero: Readonly<{ eyebrow: string; titleLines: readonly string[]; description: string; media: HomeMedia }>;
  intro: Readonly<{ eyebrow: string; statementLines: readonly string[]; description: string }>;
  journey: Readonly<{ eyebrow: string; title: string; description: string; statusLabel: string; items: readonly JourneyItem[] }>;
  manufacturing: Readonly<{
    eyebrow: string; title: string; description: string; statusLabel: string;
    frames: readonly ManufacturingFrame[];
    process: readonly string[];
    infrastructure: Readonly<{
      description: string;
      statements: readonly string[];
      stats: readonly Readonly<{ value: string; label: string; sourcePage: number }>[];
    }>;
  }>;
  values: Readonly<{ eyebrow: string; title: string; description: string; items: readonly BrandValue[] }>;
  technology: Readonly<{
    eyebrow: string; title: string; description: string; media: HomeMedia;
    steps: readonly TechnologyStep[]; machineryPartners: readonly MachineryPartner[]; machineryStatusLabel: string;
  }>;
  sustainability: Readonly<{
    eyebrow: string; title: string;
    items: readonly Readonly<{ title: string; description: string; metric?: string }>[];
    media: HomeMedia;
  }>;
  quality: Readonly<{
    eyebrow: string; title: string; description: string; items: readonly string[];
    marks: readonly string[]; media: HomeMedia;
  }>;
  innovation: Readonly<{
    eyebrow: string; title: string; description: string; marks: readonly string[];
    natureTitle: string; natureDescription: string; media: HomeMedia;
  }>;
  specifications: Readonly<{
    eyebrow: string; title: string; surfaces: readonly string[]; sizes: readonly string[];
  }>;
  markets: Readonly<{
    eyebrow: string; title: string; statement: string; description: string;
    statusLabel: string; media: HomeMedia; records: readonly MarketRecord[];
  }>;
  certifications: Readonly<{
    eyebrow: string; title: string; description: string; items: readonly CertificationPlaceholder[];
  }>;
  suppliers: Readonly<{ eyebrow: string; title: string; items: readonly string[] }>;
  research: Readonly<{
    eyebrow: string; title: string; statement: string; description: string;
    details: readonly string[]; media: HomeMedia;
  }>;
  finalCta: Readonly<{
    eyebrow: string; title: string; description: string; linkLabel: string; href: string; media: HomeMedia;
  }>;
}>;
