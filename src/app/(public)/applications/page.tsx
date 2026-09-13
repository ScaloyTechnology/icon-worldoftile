import { FoundationPage, foundationPageMetadata, type FoundationSearchParams } from "@/components/foundation-page";

export const metadata = foundationPageMetadata("applications");

export default function ApplicationsPage({ searchParams }: { searchParams: FoundationSearchParams }) {
  return <FoundationPage section="applications" searchParams={searchParams} />;
}
