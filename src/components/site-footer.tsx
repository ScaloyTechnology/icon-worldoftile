import Image from "next/image";
import Link from "next/link";

import { navigation, siteContent } from "@/content/site";
import type { PublicContactSettings } from "@/types/contact-settings";

export function SiteFooter({ settings }: Readonly<{ settings: PublicContactSettings }>) {
  const primaryUnit = settings.units[0];
  return (
    <footer className="site-footer" data-home-header-tone="dark">
      <div className="footer-intro">
        <p className="eyebrow">ICON / World of Tile</p>
        <p>Surfaces for spaces with character.</p>
      </div>
      <div className="footer-main">
        <Link className="footer-logo" href="/" aria-label="ICON home">
          <Image src={settings.logo.src} alt={settings.logo.alt} width={settings.logo.width} height={settings.logo.height} unoptimized={!settings.logo.src.startsWith("/")} />
        </Link>
        <div>
          <p className="eyebrow">Explore</p>
          <nav aria-label="Footer navigation">{navigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}</nav>
        </div>
        <div className="footer-contacts">
          <p className="eyebrow">Connect</p>
          <span>{settings.domestic.label}</span>
          <a href={settings.domestic.emailHref}>{settings.domestic.email}</a>
          <a href={settings.domestic.phoneHref}>{settings.domestic.phone}</a>
          <span>{settings.export.label}</span>
          <a href={settings.export.emailHref}>{settings.export.email}</a>
          <a href={settings.export.phoneHref}>{settings.export.phone}</a>
          {primaryUnit ? <address className="footer-address"><strong>{primaryUnit.name}</strong>{primaryUnit.addressLines.map((line, index) => <span key={`${index}-${line}`}>{line}</span>)}</address> : null}
          <Link href="/contact">View all locations</Link>
        </div>
        <div>
          <p className="eyebrow">Social</p>
          <nav aria-label="Social media">{settings.socials.map((social, index) => <a key={`${index}-${social.label}`} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`${social.label} (opens in a new tab)`}>{social.label}</a>)}</nav>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} ICON — World of Tile</span>
        <span>{siteContent.previewNotice}</span>
        <a href="#top">Back to top ↑</a>
      </div>
    </footer>
  );
}
