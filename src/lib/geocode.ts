/*
 * Address search + reverse geocoding via MapTiler's geocoding API (same key as
 * the map preview, see maptiler.ts). The UI never touches raw coordinates.
 * Results cache in-session to keep repeat lookups quiet. Degrades to no results
 * when no key is configured.
 */
import { geocodeBase, hasMap, maptilerKey } from "./maptiler";

export interface GeocodeMatch {
  lat: number;
  lng: number;
  /** Compact primary label: "Marina Street". */
  label: string;
  /** Rest of the address: "Lagos Island, Lagos, Nigeria". */
  region: string;
  /** Raw full formatted address, in case a consumer needs it. */
  fullAddress: string;
}

interface MapTilerFeature {
  center: [number, number];
  text?: string;
  place_name?: string;
}

const searchCache = new Map<string, GeocodeMatch[]>();
const reverseCache = new Map<string, GeocodeMatch>();

/** Search addresses by free text. Returns up to 5 matches. */
export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeocodeMatch[]> {
  const q = query.trim();
  if (q.length < 3 || !hasMap) return [];
  const cached = searchCache.get(q);
  if (cached) return cached;

  const url = `${geocodeBase}/${encodeURIComponent(q)}.json?key=${encodeURIComponent(maptilerKey)}&limit=5&country=ng`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data = (await res.json()) as { features?: MapTilerFeature[] };
  const matches = (data.features ?? []).map(toMatch);
  searchCache.set(q, matches);
  return matches;
}

/** Turn coordinates into an address label. Used after "Use my current location". */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<GeocodeMatch | null> {
  if (!hasMap) return null;
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = reverseCache.get(key);
  if (cached) return cached;

  const url = `${geocodeBase}/${lng},${lat}.json?key=${encodeURIComponent(maptilerKey)}&limit=1`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: MapTilerFeature[] };
  const first = data.features?.[0];
  if (!first) return null;
  const match = toMatch(first);
  reverseCache.set(key, match);
  return match;
}

function toMatch(f: MapTilerFeature): GeocodeMatch {
  const full = f.place_name ?? f.text ?? "";
  const parts = full.split(",").map((s) => s.trim());
  const name = f.text ?? parts[0] ?? "";
  // place_name often repeats the name with a house number first
  // ("Adetokunbo Ademola Street 1415, 500001 Eti Osa, Nigeria"). Prefer that more
  // specific form as the label, and drop any part that just repeats the name.
  const first = parts[0] ?? "";
  const label = name && first.startsWith(name) ? first : name;
  const region = parts
    .filter((p) => p !== label && !(name && p.startsWith(name)))
    .slice(0, 3)
    .join(", ");
  return {
    lat: f.center[1],
    lng: f.center[0],
    label,
    region,
    fullAddress: full,
  };
}
