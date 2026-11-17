import "server-only";

import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/server/db";
import type { ProductMarket } from "@/types/products";

// Use the existing CMS persistence, with one record per product so concurrent
// edits to different products never overwrite each other's market selection.
const page = "product-markets";
const payloadSchema = z.object({ market: z.enum(["DOMESTIC", "EXPORT"]) });

export async function getProductMarkets(productIds: readonly string[]): Promise<Map<string, ProductMarket>> {
  if (!productIds.length) return new Map();
  const sections = await getDb().siteSection.findMany({
    where: { page, key: { in: [...productIds] } },
    select: { key: true, content: { where: { locale: "en" }, take: 1, select: { payload: true } } },
  });
  const markets = new Map<string, ProductMarket>();
  for (const section of sections) {
    const parsed = payloadSchema.safeParse(section.content[0]?.payload);
    if (parsed.success) markets.set(section.key, parsed.data.market);
  }
  return markets;
}

export async function saveProductMarket(tx: Prisma.TransactionClient, productId: string, market: ProductMarket) {
  const section = await tx.siteSection.upsert({
    where: { page_key: { page, key: productId } },
    create: { page, key: productId, state: "PUBLISHED", sortOrder: 0 },
    update: { state: "PUBLISHED" },
    select: { id: true },
  });
  await tx.siteContent.upsert({
    where: { sectionId_locale: { sectionId: section.id, locale: "en" } },
    create: { sectionId: section.id, locale: "en", payload: { market }, version: 1 },
    update: { payload: { market }, version: { increment: 1 } },
  });
}

export async function deleteProductMarket(tx: Prisma.TransactionClient, productId: string) {
  const section = await tx.siteSection.findUnique({
    where: { page_key: { page, key: productId } }, select: { id: true },
  });
  if (!section) return;
  await tx.siteContent.deleteMany({ where: { sectionId: section.id } });
  await tx.siteSection.delete({ where: { id: section.id } });
}
