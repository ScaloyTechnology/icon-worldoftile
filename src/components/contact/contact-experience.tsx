import Image from "next/image";

import { Arrow } from "@/components/arrow";
import { ContactEnquiryForm } from "@/components/contact/contact-enquiry-form";
import { clientAssets } from "@/content/assets";
import type { PublicContactSettings } from "@/types/contact-settings";

export function ContactExperience({ settings }: Readonly<{ settings: PublicContactSettings }>) {
  return (
    <main className="contact-page" id="main">
      <section className="contact-hero" data-header-theme="dark" aria-labelledby="contact-title">
        <Image src={clientAssets.office.src!} alt={clientAssets.office.alt} fill priority sizes="100vw" style={{ objectFit: "cover", objectPosition: clientAssets.office.position }} />
        <div className="contact-hero__scrim" aria-hidden="true" />
        <div className="contact-hero__content"><p className="eyebrow">Contact ICON</p><h1 id="contact-title"><span>Let&apos;s talk</span><span>about your space.</span></h1><p>From local projects to international partnerships, connect with the right ICON team.</p></div>
      </section>

      <section className="contact-channels" aria-labelledby="contact-channels-title">
        <header><p className="eyebrow">Direct contact</p><h2 id="contact-channels-title">Start a conversation.</h2></header>
        {[settings.domestic, settings.export].map((contact, index) => (
          <article key={contact.label}><span className="contact-index">0{index + 1}</span><p className="eyebrow">{contact.label}</p><a className="contact-phone" href={contact.phoneHref}>{contact.phone}</a><a className="contact-email" href={contact.emailHref}>{contact.email}<Arrow /></a></article>
        ))}
      </section>

      <section className="contact-enquiry" id="contact-enquiry" aria-labelledby="contact-enquiry-title">
        <div className="contact-enquiry__inner">
          <header className="contact-enquiry__intro">
            <p className="eyebrow">Project enquiry</p>
            <h2 id="contact-enquiry-title">Tell us about your space.</h2>
            <p>Share your requirements and the appropriate ICON team will get back to you.</p>
          </header>
          <ContactEnquiryForm domesticLabel={settings.domestic.label} exportLabel={settings.export.label} />
        </div>
      </section>

      <section className="contact-units" data-header-theme="dark" aria-labelledby="contact-units-title">
        <header><p className="eyebrow">Production network</p><h2 id="contact-units-title">Our manufacturing units.</h2></header>
        <ol>{settings.units.map((unit) => (
          <li key={unit.id}><span className="contact-unit__number">Unit {unit.number}</span><div><h3>{unit.name}</h3><address>{unit.addressLines.map((line, index) => <span key={`${index}-${line}`}>{line}</span>)}</address></div><a className="contact-map-link" href={unit.mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`View plant location for ${unit.name} (opens in a new tab)`}>View plant location <span className="circle"><Arrow diagonal /></span></a></li>
        ))}</ol>
      </section>

      <section className="contact-social" aria-labelledby="contact-social-title"><p className="eyebrow">Follow ICON</p><h2 id="contact-social-title">Stay in touch.</h2><nav aria-label="Social media">{settings.socials.map((social, index) => <a key={`${index}-${social.label}`} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`${social.label} (opens in a new tab)`}><span>{String(index + 1).padStart(2, "0")}</span>{social.label}<Arrow diagonal /></a>)}</nav></section>
    </main>
  );
}
