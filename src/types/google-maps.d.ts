// The Google Maps JS API attaches itself to window.google after the loader
// script runs (see src/lib/google-maps.ts). @types/google.maps declares the
// `google` namespace; this makes the runtime `window.google` accessor typed too.
declare global {
  interface Window {
    google?: typeof google;
  }
}

export {};
