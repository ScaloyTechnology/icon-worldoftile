import "server-only";

import { meetIconContent } from "@/content/meet-icon";
import { mediaUrl } from "@/lib/media";
import { getDb } from "@/server/db";
import type { HomeMedia } from "@/types/home";
import type { MeetIconContent, MeetIconMediaEditorData, MeetIconMediaGroup, MeetIconMediaSlot } from "@/types/meet-icon";
import { z } from "zod";

export type MeetIconContentSource = "development-fallback" | "published-content";

export type MeetIconPageData = Readonly<{
  content: MeetIconContent;
  source: MeetIconContentSource;
  cmsPageKey: "meet-icon";
}>;

const mediaId = z.string().trim().max(64);

export const meetIconMediaPayloadSchema = z.object({
  heroMediaId: mediaId,
  journeyMediaIds: z.array(mediaId).length(11),
  manufacturingMediaIds: z.array(mediaId).length(3),
  technologyMediaIds: z.array(mediaId).length(6),
  finalCtaMediaId: mediaId,
});

export type MeetIconMediaPayload = z.infer<typeof meetIconMediaPayloadSchema>;

export function defaultMeetIconMediaPayload(): MeetIconMediaPayload {
  return {
    heroMediaId: "",
    journeyMediaIds: Array.from({ length: 11 }, () => ""),
    manufacturingMediaIds: Array.from({ length: 3 }, () => ""),
    technologyMediaIds: Array.from({ length: 6 }, () => ""),
    finalCtaMediaId: "",
  };
}

async function readPayload(requirePublished: boolean) {
  const section = await getDb().siteSection.findUnique({
    where: { page_key: { page: "meet-icon", key: "media" } },
    include: { content: { where: { locale: "en" }, take: 1 } },
  });
  if (!section || (requirePublished && section.state !== "PUBLISHED")) return null;
  const parsed = meetIconMediaPayloadSchema.safeParse(section.content[0]?.payload);
  return parsed.success ? parsed.data : null;
}

async function mediaLookup(payload: MeetIconMediaPayload) {
  const ids = [...new Set([
    payload.heroMediaId,
    ...payload.journeyMediaIds,
    ...payload.manufacturingMediaIds,
    ...payload.technologyMediaIds,
    payload.finalCtaMediaId,
  ].filter(Boolean))];
  if (!ids.length) return new Map<string, { id: string; storageKey: string; alt: string; width: number | null; height: number | null }>();
  const assets = await getDb().mediaAsset.findMany({
    where: { id: { in: ids }, approved: true, mimeType: { startsWith: "image/" } },
    select: { id: true, storageKey: true, alt: true, width: true, height: true },
  });
  return new Map(assets.map((asset) => [asset.id, asset]));
}

function resolvedMedia(
  fallback: HomeMedia,
  selectedId: string,
  assets: Awaited<ReturnType<typeof mediaLookup>>,
) {
  const asset = selectedId ? assets.get(selectedId) : undefined;
  if (!asset) return { mediaId: "", media: fallback };
  try {
    return {
      mediaId: asset.id,
      media: {
        ...fallback,
        src: mediaUrl(asset.storageKey),
        alt: asset.alt || fallback.alt,
        width: asset.width ?? fallback.width,
        height: asset.height ?? fallback.height,
      },
    };
  } catch {
    return { mediaId: "", media: fallback };
  }
}

function contentWithMedia(payload: MeetIconMediaPayload, assets: Awaited<ReturnType<typeof mediaLookup>>): MeetIconContent {
  return {
    ...meetIconContent,
    hero: { ...meetIconContent.hero, media: resolvedMedia(meetIconContent.hero.media, payload.heroMediaId, assets).media },
    journey: {
      ...meetIconContent.journey,
      items: meetIconContent.journey.items.map((item, index) => ({
        ...item,
        media: resolvedMedia(item.media, payload.journeyMediaIds[index] ?? "", assets).media,
      })),
    },
    manufacturing: {
      ...meetIconContent.manufacturing,
      frames: meetIconContent.manufacturing.frames.map((frame, index) => ({
        ...frame,
        media: resolvedMedia(frame.media, payload.manufacturingMediaIds[index] ?? "", assets).media,
      })),
    },
    technology: {
      ...meetIconContent.technology,
      steps: meetIconContent.technology.steps.map((step, index) => ({
        ...step,
        media: resolvedMedia(step.media, payload.technologyMediaIds[index] ?? "", assets).media,
      })),
    },
    finalCta: { ...meetIconContent.finalCta, media: resolvedMedia(meetIconContent.finalCta.media, payload.finalCtaMediaId, assets).media },
  };
}

function slot(
  input: Omit<MeetIconMediaSlot, "mediaId" | "media" | "fallbackMedia"> & { fallback: HomeMedia; selectedId: string },
  assets: Awaited<ReturnType<typeof mediaLookup>>,
): MeetIconMediaSlot {
  const resolved = resolvedMedia(input.fallback, input.selectedId, assets);
  return { key: input.key, fieldName: input.fieldName, label: input.label, title: input.title, description: input.description, recommendation: input.recommendation, fallbackMedia: input.fallback, ...resolved };
}

function editorGroups(payload: MeetIconMediaPayload, assets: Awaited<ReturnType<typeof mediaLookup>>): readonly MeetIconMediaGroup[] {
  return [
    {
      id: "hero", number: "01", title: "Hero section", description: "The opening full-screen image behind the Meet ICON title.",
      slots: [slot({ key: "hero", fieldName: "heroMediaId", label: "Hero background", title: "Meet ICON opening image", description: "Displayed full-screen with the existing dark overlay, title and scroll animation.", recommendation: "Landscape image · recommended 1920 × 1200 px or larger", fallback: meetIconContent.hero.media, selectedId: payload.heroMediaId }, assets)],
    },
    {
      id: "journey", number: "02", title: "History / Iconic journey", description: "Eleven images, locked to the chronological milestone order shown on the public page.",
      slots: meetIconContent.journey.items.map((item, index) => slot({ key: item.id, fieldName: "journeyMediaId", label: `${String(index + 1).padStart(2, "0")} / ${item.year ?? "Milestone"}`, title: item.title, description: `Journey milestone ${String(index + 1).padStart(2, "0")}. Replacing this image does not change its year, copy or animation.`, recommendation: "Portrait or editorial image · recommended 1400 × 1700 px or larger", fallback: item.media, selectedId: payload.journeyMediaIds[index] ?? "" }, assets)),
    },
    {
      id: "manufacturing", number: "03", title: "Manufacturing / Infrastructure", description: "Three process images shown in the pinned Material, Process and Finish sequence.",
      slots: meetIconContent.manufacturing.frames.map((frame, index) => slot({ key: frame.id, fieldName: "manufacturingMediaId", label: frame.label, title: frame.title, description: "Displayed in the existing pinned manufacturing transition.", recommendation: "Landscape image · recommended 1800 × 1200 px or larger", fallback: frame.media, selectedId: payload.manufacturingMediaIds[index] ?? "" }, assets)),
    },
    {
      id: "technology", number: "04", title: "Technology", description: "Six images matched one-to-one with the existing technology steps.",
      slots: meetIconContent.technology.steps.map((step, index) => slot({ key: step.id, fieldName: "technologyMediaId", label: `${String(index + 1).padStart(2, "0")} / ${step.label}`, title: step.title, description: "Shown in the sticky technology viewer when this step becomes active.", recommendation: "Landscape image · recommended 1600 × 1200 px or larger", fallback: step.media, selectedId: payload.technologyMediaIds[index] ?? "" }, assets)),
    },
    {
      id: "final-cta", number: "05", title: "Final image above footer", description: "The full-width background behind the Explore ICON surfaces call to action.",
      slots: [slot({ key: "final-cta", fieldName: "finalCtaMediaId", label: "Closing background", title: "Explore ICON surfaces", description: "Only the background changes; the current text, overlay and animation remain untouched.", recommendation: "Landscape image · recommended 1920 × 1200 px or larger", fallback: meetIconContent.finalCta.media, selectedId: payload.finalCtaMediaId }, assets)],
    },
  ];
}

export async function getMeetIconPageData(): Promise<MeetIconPageData> {
  if (!process.env.DATABASE_URL) return { content: meetIconContent, source: "development-fallback", cmsPageKey: "meet-icon" };
  try {
    const payload = await readPayload(true) ?? defaultMeetIconMediaPayload();
    const assets = await mediaLookup(payload);
    return { content: contentWithMedia(payload, assets), source: "published-content", cmsPageKey: "meet-icon" };
  } catch (cause) {
    console.error("Meet ICON media could not be loaded", cause);
    return { content: meetIconContent, source: "development-fallback", cmsPageKey: "meet-icon" };
  }
}

export async function getMeetIconMediaEditorData(): Promise<MeetIconMediaEditorData> {
  const payload = process.env.DATABASE_URL ? await readPayload(false).catch(() => null) ?? defaultMeetIconMediaPayload() : defaultMeetIconMediaPayload();
  const assets = process.env.DATABASE_URL ? await mediaLookup(payload) : await mediaLookup(defaultMeetIconMediaPayload());
  return {
    groups: editorGroups(payload, assets),
  };
}
