/** Approximate bounding rectangle covering Goa; not an administrative boundary. */
export const GOA_BOUNDS = {
  minLatitude: 14.85,
  maxLatitude: 15.85,
  minLongitude: 73.65,
  maxLongitude: 74.35,
} as const;

export function isWithinGoaBounds(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= GOA_BOUNDS.minLatitude && latitude <= GOA_BOUNDS.maxLatitude &&
    longitude >= GOA_BOUNDS.minLongitude && longitude <= GOA_BOUNDS.maxLongitude;
}
