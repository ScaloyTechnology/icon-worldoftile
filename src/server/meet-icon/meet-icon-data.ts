import "server-only";

import { meetIconContent } from "@/content/meet-icon";
import type { MeetIconContent } from "@/types/meet-icon";

export type MeetIconContentSource = "development-fallback" | "published-content";

export type MeetIconPageData = Readonly<{
  content: MeetIconContent;
  source: MeetIconContentSource;
  cmsPageKey: "meet-icon";
}>;

/**
 * Server boundary for future SiteContent integration. Verified client-profile
 * content remains available without making a database connection mandatory.
 */
export async function getMeetIconPageData(): Promise<MeetIconPageData> {
  return {
    content: meetIconContent,
    source: "published-content",
    cmsPageKey: "meet-icon",
  };
}
