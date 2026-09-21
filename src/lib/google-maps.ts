/**
 * Loads the Google Maps JS API once, on demand. The key comes from
 * VITE_GOOGLE_MAPS_API_KEY (baked in at build time) and should be restricted by
 * HTTP referrer in the Google Cloud console. When no key is set the map and
 * address search degrade gracefully (browser geolocation still works).
 */
export const googleMapsKey = import.meta.env["VITE_GOOGLE_MAPS_API_KEY"] ?? "";
export const hasGoogleMaps = Boolean(googleMapsKey);

let loader: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === "undefined")
    return Promise.reject(new Error("Google Maps needs a browser"));
  if (!googleMapsKey) return Promise.reject(new Error("Missing VITE_GOOGLE_MAPS_API_KEY"));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loader) return loader;

  loader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsKey)}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () =>
      window.google?.maps
        ? resolve(window.google.maps)
        : reject(new Error("Google Maps failed to initialise"));
    script.onerror = () => {
      loader = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(script);
  });
  return loader;
}
