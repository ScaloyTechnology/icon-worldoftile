import "server-only";

import { cache } from "react";
import { z } from "zod";

import { companyContact } from "@/content/company";
import { mediaUrl } from "@/lib/media";
import { getDb } from "@/server/db";
import type { ContactSettingsEditorData, PublicContactSettings, SiteLogo } from "@/types/contact-settings";

const publicUrl = z.string().trim().url().max(500).refine((value) => value.startsWith("https://") || value.startsWith("http://"), "Use an HTTP or HTTPS URL.");

export const contactSettingsPayloadSchema = z.object({
  logoMediaId: z.string().trim().max(64).default(""),
  domestic: z.object({ label: z.string().trim().min(1).max(80), phone: z.string().trim().min(5).max(40), email: z.string().trim().toLowerCase().email().max(254) }),
  export: z.object({ label: z.string().trim().min(1).max(80), phone: z.string().trim().min(5).max(40), email: z.string().trim().toLowerCase().email().max(254) }),
  socials: z.array(z.object({ label: z.string().trim().min(1).max(60), href: publicUrl })).min(1).max(8),
  units: z.array(z.object({
    id: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
    name: z.string().trim().min(1).max(180),
    addressLines: z.array(z.string().trim().min(1).max(180)).min(1).max(12),
    mapUrl: publicUrl,
  })).min(1).max(8),
});

export type ContactSettingsPayload = z.infer<typeof contactSettingsPayloadSchema>;

const defaultLogo: SiteLogo = {
  mediaId: "",
  src: "/brand/icon-logo-horizontal.png",
  alt: "ICON — World of Tile",
  width: 2060,
  height: 894,
};

export function defaultContactSettingsPayload(): ContactSettingsPayload {
  return {
    logoMediaId: "",
    domestic: { label: companyContact.domestic.label, phone: companyContact.domestic.phone, email: companyContact.domestic.email },
    export: { label: companyContact.export.label, phone: companyContact.export.phone, email: companyContact.export.email },
    socials: companyContact.socials.map((social) => ({ ...social })),
    units: companyContact.units.map((unit) => ({ id: unit.id, name: unit.name, addressLines: [...unit.addressLines], mapUrl: unit.mapUrl })),
  };
}

function phoneHref(phone: string) {
  const compact = phone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return `tel:${compact}`;
}

async function logoFromMedia(mediaId: string): Promise<SiteLogo> {
  if (!mediaId) return defaultLogo;
  const media = await getDb().mediaAsset.findFirst({
    where: { id: mediaId, approved: true, mimeType: { startsWith: "image/" } },
    select: { id: true, storageKey: true, alt: true, width: true, height: true },
  });
  if (!media) return defaultLogo;
  try {
    return { mediaId: media.id, src: mediaUrl(media.storageKey), alt: media.alt || defaultLogo.alt, width: media.width ?? defaultLogo.width, height: media.height ?? defaultLogo.height };
  } catch {
    return defaultLogo;
  }
}

async function readPayload(requirePublished: boolean) {
  const section = await getDb().siteSection.findUnique({
    where: { page_key: { page: "global", key: "contact-settings" } },
    include: { content: { where: { locale: "en" }, take: 1 } },
  });
  if (!section || (requirePublished && section.state !== "PUBLISHED")) return null;
  const parsed = contactSettingsPayloadSchema.safeParse(section.content[0]?.payload);
  return parsed.success ? parsed.data : null;
}

function publicSettings(payload: ContactSettingsPayload, logo: SiteLogo): PublicContactSettings {
  return {
    logo,
    domestic: { ...payload.domestic, phoneHref: phoneHref(payload.domestic.phone), emailHref: `mailto:${payload.domestic.email}` },
    export: { ...payload.export, phoneHref: phoneHref(payload.export.phone), emailHref: `mailto:${payload.export.email}` },
    socials: payload.socials,
    units: payload.units.map((unit, index) => ({ ...unit, number: String(index + 1).padStart(2, "0") })),
  };
}

export const getContactSettings = cache(async (): Promise<PublicContactSettings> => {
  const fallback = defaultContactSettingsPayload();
  if (!process.env.DATABASE_URL) return publicSettings(fallback, defaultLogo);
  try {
    const payload = await readPayload(true) ?? fallback;
    return publicSettings(payload, await logoFromMedia(payload.logoMediaId));
  } catch (cause) {
    console.error("Public contact settings could not be loaded", cause);
    return publicSettings(fallback, defaultLogo);
  }
});

export async function getContactSettingsEditorData(): Promise<ContactSettingsEditorData> {
  const fallback = defaultContactSettingsPayload();
  const payload = process.env.DATABASE_URL ? await readPayload(false).catch(() => null) ?? fallback : fallback;
  return {
    logo: await logoFromMedia(payload.logoMediaId).catch(() => defaultLogo),
    domestic: payload.domestic,
    export: payload.export,
    socials: payload.socials,
    units: payload.units.map((unit, index) => ({ ...unit, number: String(index + 1).padStart(2, "0") })),
  };
}
