import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { mediaUrl } from "@/lib/media";
import { trustedRequestOrigin } from "@/server/auth/policy";
import { getDb } from "@/server/db";
import { getEmailProvider } from "@/server/email/provider";

export const runtime = "nodejs";

const ADMIN_EMAIL = process.env.CATALOGUE_NOTIFICATION_EMAIL?.trim() || "hemay.patel.05@gmail.com";
const requestSchema = z.object({
  catalogueId: z.string().trim().min(1).max(64),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[0-9+() -]{7,20}$/),
  email: z.string().trim().toLowerCase().email().max(254),
  market: z.enum(["domestic", "export"]),
  website: z.string().max(0).optional().default(""),
});

const attempts = new Map<string, { count: number; resetAt: number }>();

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}

function rateLimitKey(request: NextRequest, email: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${forwarded || "local"}:${email}`;
}

function allowed(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (current.count >= 5) return false;
  current.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  if (!trustedRequestOrigin(request)) return fail("Request origin could not be verified.", 403);
  let body: unknown;
  try { body = await request.json(); }
  catch { return fail("The catalogue request was incomplete.", 400); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return fail("Check your name, phone number, email and enquiry market.", 400);
  if (!allowed(rateLimitKey(request, parsed.data.email))) return fail("Too many catalogue requests. Please try again in a few minutes.", 429);

  try {
    const catalogue = await getDb().catalogue.findFirst({
      where: { id: parsed.data.catalogueId, state: "PUBLISHED" },
      include: { pdf: true },
    });
    if (!catalogue?.pdf?.approved || catalogue.pdf.mimeType !== "application/pdf") return fail("This catalogue PDF is not currently available.", 404);
    const downloadUrl = mediaUrl(catalogue.pdf.storageKey);
    const marketLabel = parsed.data.market === "export" ? "Export / International" : "Domestic / India";
    const safeName = escapeHtml(parsed.data.name);
    const safeTitle = escapeHtml(catalogue.title);

    const provider = getEmailProvider();
    const deliveries = await Promise.allSettled([
      provider.send({
        to: parsed.data.email,
        subject: `Your ICON catalogue download — ${catalogue.title}`,
        text: `Hello ${parsed.data.name},\n\nYour download of “${catalogue.title}” was successful.\n\nThank you for exploring ICON — World of Tile. Our team may contact you regarding relevant surface collections and catalogue updates.\n\nICON — World of Tile`,
        html: `<div style="font-family:Arial,sans-serif;color:#242322;line-height:1.6;max-width:620px;margin:auto"><p style="font-size:12px;letter-spacing:2px;text-transform:uppercase">ICON — World of Tile</p><h1 style="font-size:32px;font-weight:500;line-height:1.1">Your catalogue download was successful.</h1><p>Hello ${safeName},</p><p>Your download of <strong>${safeTitle}</strong> was successful.</p><p>Thank you for exploring ICON. Our team may contact you regarding relevant surface collections and catalogue updates.</p><hr style="border:0;border-top:1px solid #ddd;margin:28px 0"><p style="font-size:12px;color:#777">ICON — World of Tile</p></div>`,
      }),
      provider.send({
        to: ADMIN_EMAIL,
        replyTo: parsed.data.email,
        subject: `Catalogue downloaded: ${catalogue.title}`,
        text: `A visitor downloaded an ICON catalogue.\n\nCatalogue: ${catalogue.title}\nPDF file: ${catalogue.pdf.originalFilename}\nName: ${parsed.data.name}\nPhone: ${parsed.data.phone}\nEmail: ${parsed.data.email}\nMarket: ${marketLabel}\nTime: ${new Date().toISOString()}`,
        html: `<div style="font-family:Arial,sans-serif;color:#242322;line-height:1.6;max-width:680px;margin:auto"><p style="font-size:12px;letter-spacing:2px;text-transform:uppercase">ICON catalogue notification</p><h1 style="font-size:30px;font-weight:500">${safeTitle} was downloaded.</h1><table style="width:100%;border-collapse:collapse"><tr><td style="padding:10px;border-bottom:1px solid #ddd;color:#777">Name</td><td style="padding:10px;border-bottom:1px solid #ddd">${safeName}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #ddd;color:#777">Phone</td><td style="padding:10px;border-bottom:1px solid #ddd">${escapeHtml(parsed.data.phone)}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #ddd;color:#777">Email</td><td style="padding:10px;border-bottom:1px solid #ddd"><a href="mailto:${escapeHtml(parsed.data.email)}">${escapeHtml(parsed.data.email)}</a></td></tr><tr><td style="padding:10px;border-bottom:1px solid #ddd;color:#777">Market</td><td style="padding:10px;border-bottom:1px solid #ddd">${marketLabel}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #ddd;color:#777">Catalogue</td><td style="padding:10px;border-bottom:1px solid #ddd">${safeTitle}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #ddd;color:#777">PDF</td><td style="padding:10px;border-bottom:1px solid #ddd">${escapeHtml(catalogue.pdf.originalFilename)}</td></tr></table></div>`,
      }),
    ]);
    const visitorEmailSent = deliveries[0]?.status === "fulfilled";
    const adminEmailSent = deliveries[1]?.status === "fulfilled";
    if (!visitorEmailSent || !adminEmailSent) {
      console.error("Catalogue download email delivery failed", deliveries.filter((delivery) => delivery.status === "rejected"));
    }

    return NextResponse.json({
      downloadUrl,
      filename: catalogue.pdf.originalFilename,
      emailSent: visitorEmailSent,
      adminEmailSent,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Catalogue download request failed", cause);
    return fail("We could not prepare this catalogue download just now. Please try again shortly.", 503);
  }
}
