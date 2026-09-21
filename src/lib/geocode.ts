/*
 * Address search + reverse geocoding via the Google Maps JS Geocoder. Uses the
 * same Maps key as the map preview (see google-maps.ts); the UI never touches
 * raw coordinates. Results cache in-session to keep repeat lookups quiet.
 */
import { loadGoogleMaps } from "./google-maps";

export interface GeocodeMatch {
  lat: number;
  lng: number;
  /** Compact primary label: "12 Marina Street". */
  label: string;
  /** Rest of the address: "Lagos Island, Lagos, Nigeria". */
  region: string;
  /** Raw full formatted address, in case a consumer needs it. */
  fullAddress: string;
}

const searchCache = new Map<string, GeocodeMatch[]>();
const reverseCache = new Map<string, GeocodeMatch>();

/** Search addresses by free text. Returns up to 5 matches. */
export async function searchAddress(query: string, _signal?: AbortSignal): Promise<GeocodeMatch[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const cached = searchCache.get(q);
  if (cached) return cached;

  const maps = await loadGoogleMaps();
  const geocoder = new maps.Geocoder();
  let matches: GeocodeMatch[] = [];
  try {
    const { results } = await geocoder.geocode({ address: q, region: "NG" });
    matches = results.slice(0, 5).map(toMatch);
  } catch {
    matches = [];
  }
  searchCache.set(q, matches);
  return matches;
}

/** Turn coordinates into an address label. Used after "Use my current location". */
export async function reverseGeocode(
  lat: number,
  lng: number,
  _signal?: AbortSignal,
): Promise<GeocodeMatch | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = reverseCache.get(key);
  if (cached) return cached;

  const maps = await loadGoogleMaps();
  const geocoder = new maps.Geocoder();
  try {
    const { results } = await geocoder.geocode({ location: { lat, lng } });
    if (!results.length) return null;
    const match = toMatch(results[0]);
    reverseCache.set(key, match);
    return match;
  } catch {
    return null;
  }
}

function toMatch(r: google.maps.GeocoderResult): GeocodeMatch {
  const comp = (type: string) =>
    r.address_components.find((c) => c.types.includes(type))?.long_name;
  const number = comp("street_number");
  const route = comp("route");
  const parts = r.formatted_address.split(",").map((s) => s.trim());
  const primary = (number && route ? `${number} ${route}` : (route ?? parts[0])) ?? parts[0];
  const region = parts
    .filter((p) => p !== primary)
    .slice(0, 3)
    .join(", ");
  return {
    lat: r.geometry.location.lat(),
    lng: r.geometry.location.lng(),
    label: primary,
    region,
    fullAddress: r.formatted_address,
  };
}
