import { BrandLoader } from "@/components/brand-loader";

/** Stream a branded shell while the route/layout itself is still preparing. */
export default function Loading() {
  return <BrandLoader trackLifecycle={false} label="Preparing ICON" />;
}
