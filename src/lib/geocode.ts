/*
 * Minimal wrapper around OpenStreetMap Nominatim so the UI never touches raw
 * coordinates and never hardcodes an API key.
 *
 * Nominatim is unauthenticated but rate-limited (1 req/sec) and expects a
 * User-Agent identifying the app. Browsers can't set User-Agent, so we send a
 * Referer via the browser default and identify via the `email` param.
 *
 * All functions cache in-session to keep repeat searches quiet.
 */
const ENDPOINT = "https://nominatim.openstreetmap.org";
const CONTACT = "conecktos@ehigiatorpowell1";

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
export async function searchAddress(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeMatch[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const cached = searchCache.get(q);
  if (cached) return cached;

  const url = new URL(`${ENDPOINT}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("email", CONTACT);

  const res = await fetch(url.toString(), { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data = (await res.json()) as NominatimHit[];
  const matches = data.map(toMatch);
  searchCache.set(q, matches);
  return matches;
}

/** Turn coordinates into an address label. Used after "Use my current location". */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<GeocodeMatch | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = reverseCache.get(key);
  if (cached) return cached;

  const url = new URL(`${ENDPOINT}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("email", CONTACT);

  const res = await fetch(url.toString(), { signal, headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimHit;
  if (!data || !data.lat) return null;
  const match = toMatch(data);
  reverseCache.set(key, match);
  return match;
}

interface NominatimHit {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string | undefined>;
}

function toMatch(hit: NominatimHit): GeocodeMatch {
  const a = hit.address ?? {};
  // Build "12 Marina Street" if we can; fall back to first display_name segment.
  const parts = hit.display_name.split(",").map((s) => s.trim());
  const houseNumber = a.house_number;
  const street = a.road ?? a.pedestrian ?? a.footway ?? a.path ?? a.neighbourhood;
  const primary =
    (houseNumber && street ? `${houseNumber} ${street}` : street ?? parts[0]) ?? parts[0];
  // Region: everything after the primary component, trimmed to 3 useful bits.
  const rest = parts.filter((p) => p !== primary).slice(0, 3);
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label: primary,
    region: rest.join(", "),
    fullAddress: hit.display_name,
  };
}
