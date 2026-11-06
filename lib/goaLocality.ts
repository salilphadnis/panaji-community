import { GOA_LOCATIONS } from "@/lib/locations";

/** Approximate nearest named locality from the app's curated Goa list.
 * This is not reverse geocoding or an administrative boundary lookup.
 */
export function nearestGoaLocality(latitude: number, longitude: number): string | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  let nearest: string | null = null;
  let best = Infinity;
  for (const place of GOA_LOCATIONS) {
    const latDistance = (latitude - place.latitude) * 111.2;
    const lonDistance = (longitude - place.longitude) * 111.2 * Math.cos(latitude * Math.PI / 180);
    const distanceSquared = latDistance * latDistance + lonDistance * lonDistance;
    if (distanceSquared < best) {
      best = distanceSquared;
      nearest = place.name;
    }
  }
  return nearest;
}

export function reportLocality(report: { village: string | null; latitude: number; longitude: number }): string {
  return report.village?.trim() || nearestGoaLocality(report.latitude, report.longitude) || "Location unavailable";
}
