import Link from "next/link";
import { Arrow } from "@/components/arrow";
import { EditorialImage } from "@/components/editorial-image";
import { HeroScrollExperience } from "@/components/home/hero/hero-scroll-experience";
import { siteContent as content } from "@/content/site";
import { pageMetadata, organizationSchema, serializeSchema, indexable } from "@/lib/seo";
import { getHomepageExperience } from "@/server/homepage/homepage-data";
export const metadata = pageMetadata("World of Tile", "Explore ICON through architectural spaces, tile surfaces and material studies.", "/", true);
export const revalidate = 60;
export default async function HomePage() {
  const experience = await getHomepageExperience();
  return <main id="main" className="home-page">
    {indexable && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(organizationSchema()) }} />}
    <HeroScrollExperience data={experience} />
    <section id="surfaces" className="surfaces" aria-labelledby="surface-heading"><div className="surface-copy"><p className="eyebrow">03 — Explore surfaces</p><h2 id="surface-heading">Look closer.<br /><span>Feel the difference.</span></h2><p>Explore the possibilities of surface and finish.</p><div className="surface-links">{content.surfaces.map((item, i) => <Link href={`/products?surface=${item.slug}`} key={item.slug}><small>0{i + 1}</small><span>{item.name}</span><Arrow diagonal /></Link>)}</div><p className="content-note">Surface terms from the client plan. Image is an atmosphere study; finish associations await verification.</p></div><div className="surface-visual" data-image-reveal><EditorialImage media="detail" sizes="(max-width: 760px) 100vw, 50vw" /><span className="image-label">A STUDY IN TEXTURE</span></div></section>
    <section className="section applications" aria-labelledby="application-heading"><div className="section-heading"><div><p className="eyebrow">04 — Spaces & possibilities</p><h2 id="application-heading">Life, on every surface.</h2></div><p className="section-aside">Different spaces.<br />New perspectives.</p></div><div className="application-grid"><div className="application-visual" data-parallax><EditorialImage media="application" sizes="(max-width: 760px) 90vw, 55vw" /></div><div className="application-list">{content.applications.map((name, i) => <Link href={`/applications?application=${name.toLowerCase()}`} key={name}><small>0{i + 1}</small><h3>{name}</h3><Arrow diagonal /></Link>)}</div></div><p className="content-note">Application groups from the client website map. Product suitability is not yet confirmed.</p></section>
    <section className="section certifications" aria-labelledby="certification-heading"><p className="eyebrow">05 — Certifications</p><div data-reveal><h2 id="certification-heading">{content.certifications.title}</h2><p>{content.certifications.body}</p></div><Link href="/technical-specs" className="text-link">Technical information<Arrow diagonal /></Link></section>
    <section className="section catalogue-section" aria-labelledby="catalogue-heading"><div><p className="eyebrow">06 — The catalogue library</p><h2 id="catalogue-heading">{content.catalogues.title}</h2><p>{content.catalogues.body}</p><Link href="/catalogues" className="text-link">Visit the library<Arrow diagonal /></Link></div><div className="catalogue-pending"><span className="eyebrow">ICON / PUBLICATIONS</span><span className="catalogue-monogram" aria-hidden="true">i.</span><p>{content.catalogues.status}</p><span className="eyebrow">Catalogue showcase · Awaiting PDFs</span></div></section>
    <section className="enquiry-section" aria-labelledby="enquiry-heading"><p className="eyebrow">{content.enquiry.eyebrow}</p><div><h2 id="enquiry-heading">{content.enquiry.title}</h2><Link href="/contact" className="enquiry-link" aria-label={content.enquiry.cta}><Arrow diagonal /></Link></div><Link href="/contact" className="text-link">{content.enquiry.cta}<Arrow /></Link></section>
  </main>;
}
