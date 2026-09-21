/**
 * MapTiler configuration for the map preview + geocoding. The key comes from
 * VITE_MAPTILER_KEY (free tier, no card). When it is absent the map and address
 * search degrade gracefully (browser geolocation still works). Restrict the key
 * by allowed origins in the MapTiler dashboard.
 */
export const maptilerKey = import.meta.env["VITE_MAPTILER_KEY"] ?? "";
export const hasMap = Boolean(maptilerKey);

/** Vector style URL for MapLibre, keyed to the account. */
export const mapStyleUrl = `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(maptilerKey)}`;

/** Base URL for MapTiler's geocoding API. */
export const geocodeBase = "https://api.maptiler.com/geocoding";
