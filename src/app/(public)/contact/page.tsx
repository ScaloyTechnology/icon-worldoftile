import { ContactExperience } from "@/components/contact/contact-experience";
import { breadcrumbSchema, indexable, organizationSchema, pageMetadata, serializeSchema } from "@/lib/seo";
import { getContactSettings } from "@/server/site/contact-settings";

export const metadata = pageMetadata(
  "Contact ICON",
  "Contact ICON World of Tile for domestic and export inquiries, and view our three verified manufacturing-unit locations in Gujarat, India.",
  "/contact",
  true,
);

export default async function ContactPage() {
  const settings = await getContactSettings();
  return (
    <>
      {indexable ? <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(organizationSchema(settings)) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }])) }} /></> : null}
      <ContactExperience settings={settings} />
    </>
  );
}
