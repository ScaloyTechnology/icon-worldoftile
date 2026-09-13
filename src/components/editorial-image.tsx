import Image from "next/image";
import { getEditorialMedia } from "@/lib/media";
export function EditorialImage({ media, priority = false, sizes = "(max-width: 760px) 100vw, 60vw", className = "" }: { media: string; priority?: boolean; sizes?: string; className?: string }) {
  const item = getEditorialMedia(media);
  return <div className={`editorial-image ${className}`}><Image src={item.src} alt={item.alt} fill sizes={sizes} preload={priority} style={{ objectFit: "cover" }} /></div>;
}
