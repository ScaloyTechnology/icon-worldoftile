import { companyContact } from "@/content/company";
import type { ContactUnit } from "@/types/contact-settings";

// Coordinates come from the exact Google Maps place URLs already attached to
// these three verified addresses in companyContact (resolved 2026-09-20).
const coordinates: Record<string, readonly [latitude: number, longitude: number]> = {
  "icon-granito": [22.8350833, 70.8688517],
  "acecon-vitrified": [22.7232014, 70.9869773],
  "duracon-vitrified": [22.7435962, 70.9509434],
};

const fallbackCoordinates = companyContact.units.map((unit) => coordinates[unit.id] ?? coordinates["icon-granito"]!);

export function globalPresenceUnits(units: readonly ContactUnit[]) {
  return units.map((unit, index) => ({
    ...unit,
    coordinates: coordinates[unit.id] ?? fallbackCoordinates[index] ?? fallbackCoordinates[0]!,
  }));
}

export type GlobalPresenceUnit = ReturnType<typeof globalPresenceUnits>[number];

// The GLB's globe has north on +Y, Greenwich on +X and east toward -Z.
// Its embedded UVs were checked against the supplied Earth texture.
export function geoToGlobePosition(latitude: number, longitude: number, radius = 1) {
  const lat = latitude * Math.PI / 180;
  const lon = longitude * Math.PI / 180;
  return [
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * Math.cos(lat) * Math.sin(lon),
  ] as const;
}

export function facingAngles(latitude: number, longitude: number) {
  return {
    tilt: latitude * Math.PI / 180,
    spin: -(longitude + 90) * Math.PI / 180,
  };
}
