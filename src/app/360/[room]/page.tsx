import type { Metadata } from "next";
import { notFound } from "next/navigation";

import roomManifest from "@/data/virtual-tour-rooms.json";
import { VirtualTourFrame } from "./virtual-tour-frame";

type Props = { params: Promise<{ room: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return roomManifest.map(({ slug }) => ({ room: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { room: slug } = await params;
  const room = roomManifest.find((entry) => entry.slug === slug);
  return {
    title: room ? `${room.name} — Virtual 360` : "Virtual 360",
    description: room ? `Explore ${room.name} in the ICON 360-degree virtual showroom.` : undefined,
  };
}

export default async function VirtualTourRoom({ params }: Props) {
  const { room: slug } = await params;
  const room = roomManifest.find((entry) => entry.slug === slug);
  if (!room) notFound();

  return <VirtualTourFrame initialRoomId={room.id} />;
}
