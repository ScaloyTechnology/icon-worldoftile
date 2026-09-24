import { Montserrat } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MotionRoot } from "@/components/motion/motion-root";
import { getContactSettings } from "@/server/site/contact-settings";

const montserrat = Montserrat({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-icon-montserrat",
});

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const contactSettings = await getContactSettings();
  return <div className={`public-site ${montserrat.variable}`}>
    <a href="#main" className="skip-link">Skip to content</a>
    <SiteHeader logo={contactSettings.logo} />
    <MotionRoot>{children}</MotionRoot>
    <SiteFooter settings={contactSettings} />
  </div>;
}
