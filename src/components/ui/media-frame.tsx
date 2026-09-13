import Image from "next/image";

import type { HomeMedia } from "@/types/home";

type MediaFrameProps = Readonly<{
  media: HomeMedia;
  className?: string;
  imageClassName?: string;
  captionClassName?: string;
  priority?: boolean;
  sizes?: string;
}>;

const toneClasses: Record<HomeMedia["tone"], string> = {
  clay: "media-tone-clay",
  deep: "media-tone-deep",
  mineral: "media-tone-mineral",
  sand: "media-tone-sand",
  stone: "media-tone-stone",
};

export function MediaFrame({
  media,
  className = "",
  imageClassName = "",
  captionClassName = "",
  priority = false,
  sizes = "100vw",
}: MediaFrameProps) {
  return (
    <figure className={`media-frame relative overflow-hidden ${className}`}>
      {media.src ? (
        <Image
          alt={media.alt}
          className={`object-cover ${imageClassName}`}
          fill
          preload={priority}
          sizes={sizes}
          src={media.src}
          style={{ objectPosition: media.position ?? "50% 50%" }}
        />
      ) : (
        /* Development placeholder: replace media.src with the approved asset named by placeholderLabel. */
        <div
          aria-label={`Media placeholder: ${media.placeholderLabel}`}
          className={`media-placeholder absolute inset-0 ${toneClasses[media.tone]}`}
          role="img"
        >
          <span
            className={`type-caption absolute right-5 bottom-5 left-5 flex flex-col items-start gap-2 sm:right-7 sm:bottom-7 sm:left-7 sm:flex-row sm:items-end sm:justify-between sm:gap-6 ${captionClassName}`}
          >
            <span className="max-w-[18rem]">{media.placeholderLabel}</span>
            <span aria-hidden="true" className="hidden sm:inline">
              ICON
            </span>
          </span>
        </div>
      )}
    </figure>
  );
}
