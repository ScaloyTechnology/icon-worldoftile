"use client";

import { useEffect, useRef, useState } from "react";

import roomManifest from "@/data/virtual-tour-rooms.json";
import styles from "./virtual-tour.module.css";

const roomsById = new Map(roomManifest.map((room) => [room.id, room]));
const roomsBySlug = new Map(roomManifest.map((room) => [room.slug, room]));

export function VirtualTourFrame({ initialRoomId }: { initialRoomId: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  // Keep the frame URL stable when client-side history changes the room slug.
  const [source] = useState(() => `/virtual-tour/index.html?room=${encodeURIComponent(initialRoomId)}`);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type !== "icon-360:room-change") return;
      const room = roomsById.get(event.data.roomId);
      if (!room) return;
      const path = `/360/${room.slug}`;
      if (window.location.pathname !== path) window.history.pushState(null, "", path);
    };

    const onPopState = () => {
      const slug = window.location.pathname.split("/")[2] ?? "";
      const room = roomsBySlug.get(slug);
      if (room) frame.current?.contentWindow?.postMessage(
        { type: "icon-360:navigate", roomId: room.id }, window.location.origin,
      );
    };

    window.addEventListener("message", onMessage);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return <main className={styles.tour} aria-label="ICON virtual tile showroom">
    <iframe
      ref={frame}
      className={styles.frame}
      src={source}
      title="ICON 360-degree virtual showroom"
      allowFullScreen
      onLoad={() => {
        const slug = window.location.pathname.split("/")[2] ?? "";
        const room = roomsBySlug.get(slug);
        if (room) frame.current?.contentWindow?.postMessage(
          { type: "icon-360:navigate", roomId: room.id }, window.location.origin,
        );
      }}
    />
  </main>;
}
