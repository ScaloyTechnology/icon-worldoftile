import { Suspense } from "react";
import { Montserrat } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MotionRoot } from "@/components/motion/motion-root";
import { SiteLoader } from "@/components/site-loader";
import { getContactSettings, getDefaultContactSettings } from "@/server/site/contact-settings";
import { navigation } from "@/content/site";

const montserrat = Montserrat({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-icon-montserrat",
});

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className={`public-site ${montserrat.variable}`}>
    <SiteLoader />
    <a href="#main" className="skip-link">Skip to content</a>
    <Suspense fallback={<><span hidden data-route-pending /><SiteHeader logo={getDefaultContactSettings().logo} navigation={navigation} /></>}><PublicHeader /></Suspense>
    <MotionRoot>{children}</MotionRoot>
    <Suspense fallback={<span hidden data-home-content-pending />}><PublicFooter /></Suspense>
  </div>;
}

async function PublicHeader() {
  const settings = await getContactSettings();
  return <SiteHeader logo={settings.logo} navigation={navigation} />;
}

async function PublicFooter() {
  return <SiteFooter settings={await getContactSettings()} />;
}
