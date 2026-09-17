import { Montserrat } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MotionRoot } from "@/components/motion/motion-root";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { ScrollProgress } from "@/components/animations/scroll-progress";

const montserrat = Montserrat({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-icon-montserrat",
});

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className={`public-site ${montserrat.variable}`}>
    <a href="#main" className="skip-link">Skip to content</a>
    <SiteHeader />
    <SmoothScroll>
      <MotionRoot>{children}</MotionRoot>
    </SmoothScroll>
    <SiteFooter />
    <ScrollProgress />
  </div>;
}
