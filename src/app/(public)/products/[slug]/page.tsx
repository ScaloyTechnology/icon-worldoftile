import { notFound } from "next/navigation";
export const dynamicParams = false;
export function generateStaticParams() { return []; }
// Real records will be resolved by the product service in Phase 2.
export default function ProductDetail() { notFound(); }
