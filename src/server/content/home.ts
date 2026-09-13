import "server-only";
import { z } from "zod";
import { siteContent } from "@/content/site";
import { getDb } from "@/server/db";
const heroSchema = z.object({ eyebrow: z.string().min(1).max(120), lines: z.array(z.string().min(1).max(80)).min(1).max(3), cta: z.string().min(1).max(40) });
/** The service boundary for future CMS publishing; drafts never replace approved copy. */
export async function getPublishedHero() {
  const section = await getDb().siteSection.findUnique({ where: { page_key: { page: "home", key: "hero" } }, include: { content: { where: { locale: "en" } } } });
  if (section?.state !== "PUBLISHED") return siteContent.hero;
  return heroSchema.parse(section.content[0]?.payload);
}
