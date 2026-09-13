import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import { siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ICON — World of Tile", template: "%s | ICON — World of Tile" },
  description: "Explore the world of ICON. Tile surfaces, architectural inspiration and material possibilities.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-scroll-behavior="smooth"><body id="top">{children}</body></html>;
}
