export type SiteLogo = Readonly<{
  mediaId: string;
  src: string;
  alt: string;
  width: number;
  height: number;
}>;

export type ContactChannel = Readonly<{
  label: string;
  phone: string;
  phoneHref: string;
  email: string;
  emailHref: string;
}>;

export type ContactUnit = Readonly<{
  id: string;
  number: string;
  name: string;
  addressLines: readonly string[];
  mapUrl: string;
}>;

export type SocialLink = Readonly<{
  label: string;
  href: string;
}>;

export type PublicContactSettings = Readonly<{
  logo: SiteLogo;
  domestic: ContactChannel;
  export: ContactChannel;
  units: readonly ContactUnit[];
  socials: readonly SocialLink[];
}>;

export type ContactSettingsEditorData = Readonly<{
  logo: SiteLogo;
  domestic: Omit<ContactChannel, "phoneHref" | "emailHref">;
  export: Omit<ContactChannel, "phoneHref" | "emailHref">;
  units: readonly ContactUnit[];
  socials: readonly SocialLink[];
}>;
