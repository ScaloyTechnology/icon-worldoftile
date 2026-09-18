import Image from "next/image";
import Link from "next/link";

import { companyContact } from "@/content/company";
import { navigation, siteContent } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="site-footer" data-home-header-tone="dark">
      <div className="footer-intro">
        <p className="eyebrow">ICON / World of Tile</p>
        <p>Surfaces for spaces with character.</p>
      </div>
      <div className="footer-main">
        <Link className="footer-logo" href="/" aria-label="ICON home">
          <Image src="/brand/icon-logo-horizontal.png" alt="ICON World of Tile" width={2060} height={894} />
        </Link>
        <div>
          <p className="eyebrow">Explore</p>
          <nav aria-label="Footer navigation">{navigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}</nav>
        </div>
        <div className="footer-contacts">
          <p className="eyebrow">Connect</p>
          <span>Domestic</span>
          <a href={companyContact.domestic.emailHref}>{companyContact.domestic.email}</a>
          <a href={companyContact.domestic.phoneHref}>{companyContact.domestic.phone}</a>
          <span>Export</span>
          <a href={companyContact.export.emailHref}>{companyContact.export.email}</a>
          <a href={companyContact.export.phoneHref}>{companyContact.export.phone}</a>
          <Link href="/contact">View all locations</Link>
        </div>
        <div>
          <p className="eyebrow">Social</p>
          <nav aria-label="Social media">{companyContact.socials.map((social) => <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`${social.label} (opens in a new tab)`}>{social.label}</a>)}</nav>
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
