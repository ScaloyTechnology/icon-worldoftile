import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MotionRoot } from "@/components/motion/motion-root";
import { ScrollProgress } from "@/components/animations/scroll-progress";
export default function PublicLayout({ children }: { children: React.ReactNode }) { return <><a href="#main" className="skip-link">Skip to content</a><SiteHeader /><MotionRoot>{children}</MotionRoot><SiteFooter /><ScrollProgress /></>; }
