import { companyContact } from "@/content/company";

type UnitId = (typeof companyContact.units)[number]["id"];

// Coordinates come from the exact Google Maps place URLs already attached to
// these three verified addresses in companyContact (resolved 2026-09-20).
const coordinates: Record<UnitId, readonly [latitude: number, longitude: number]> = {
  "icon-granito": [22.8350833, 70.8688517],
  "acecon-vitrified": [22.7232014, 70.9869773],
  "duracon-vitrified": [22.7435962, 70.9509434],
};

export const globalPresenceUnits = companyContact.units.map((unit) => ({
  ...unit,
  coordinates: coordinates[unit.id],
}));

export type GlobalPresenceUnit = (typeof globalPresenceUnits)[number];

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
