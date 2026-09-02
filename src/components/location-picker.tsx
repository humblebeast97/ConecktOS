import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Navigation, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { reverseGeocode, searchAddress, type GeocodeMatch } from "@/lib/geocode";
import "leaflet/dist/leaflet.css";

export interface LocationValue {
  latitude: number;
  longitude: number;
  address_label: string;
}

interface Props {
  value: LocationValue | null;
  radiusMeters: number;
  onChange: (next: LocationValue) => void;
}

const SEARCH_DEBOUNCE_MS = 350;

export function LocationPicker({ value, radiusMeters, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<GeocodeMatch[]>([]);
  const [status, setStatus] = useState<
    "idle" | "searching" | "locating" | "denied" | "unavailable" | "error"
  >("idle");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  // Debounced search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setMatches([]);
      return;
    }
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      setStatus("searching");
      try {
        const results = await searchAddress(q, controller.signal);
        setMatches(results);
        setActiveIdx(0);
        setStatus(results.length ? "idle" : "unavailable");
      } catch (e) {
        if (!controller.signal.aborted) setStatus("error");
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(id);
      controller.abort();
    };
  }, [query]);

  const pick = (m: GeocodeMatch) => {
    onChange({
      latitude: m.lat,
      longitude: m.lng,
      address_label: m.region ? `${m.label}, ${m.region}` : m.label,
    });
    setQuery("");
    setMatches([]);
    setOpen(false);
  };

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const match = await reverseGeocode(latitude, longitude);
        onChange({
          latitude,
          longitude,
          address_label: match
            ? match.region
              ? `${match.label}, ${match.region}`
              : match.label
            : "My location",
        });
        setStatus("idle");
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => Math.min(matches.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter" && matches[activeIdx]) {
              e.preventDefault();
              pick(matches[activeIdx]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={value ? "Search a different address" : "Start typing your address"}
          className="h-11 bg-surface pl-10 pr-10 text-sm"
          aria-label="Search address"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setMatches([]);
            }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}

        {open && (matches.length > 0 || status === "searching") ? (
          <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
            {status === "searching" && matches.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Searching...
              </div>
            ) : (
              matches.map((m, i) => (
                <button
                  key={`${m.lat}-${m.lng}-${i}`}
                  type="button"
                  onClick={() => pick(m)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={
                    (i === activeIdx ? "bg-primary/10" : "") +
                    " flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left text-sm last:border-b-0"
                  }
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.label}</span>
                    {m.region ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {m.region}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))
            )}
            <div className="border-t border-border bg-background/50 px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Search via OpenStreetMap
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={status === "locating"}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary disabled:opacity-60"
        >
          {status === "locating" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Navigation className="size-3" />
          )}
          {status === "locating" ? "Getting your location..." : "Use my current location"}
        </button>
        <StatusHint status={status} />
      </div>

      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 px-3.5 py-2.5 text-sm">
          <MapPin className="size-4 shrink-0 text-success" />
          <span className="min-w-0 flex-1 truncate" title={value.address_label}>
            {value.address_label}
          </span>
        </div>
      ) : null}

      <MapPreview value={value} radiusMeters={radiusMeters} />
    </div>
  );
}

function StatusHint({ status }: { status: string }) {
  if (status === "denied")
    return (
      <span className="text-xs text-destructive">Location blocked. Type the address instead.</span>
    );
  if (status === "unavailable")
    return <span className="text-xs text-muted-foreground">No matches</span>;
  if (status === "error")
    return <span className="text-xs text-warning">Search unavailable. Try again.</span>;
  return null;
}

/** Leaflet map with a marker + radius circle. Rendered client-side only. */
function MapPreview({
  value,
  radiusMeters,
}: {
  value: LocationValue | null;
  radiusMeters: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const state = useRef<{
    map: import("leaflet").Map;
    marker: import("leaflet").Marker;
    circle: import("leaflet").Circle;
  } | null>(null);

  const center = useMemo<[number, number] | null>(
    () => (value ? [value.latitude, value.longitude] : null),
    [value],
  );

  useEffect(() => {
    if (!ref.current || !center) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      if (!state.current) {
        const map = L.map(ref.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView(center, 16);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);
        L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap").addTo(map);
        const marker = L.circleMarker(center, {
          radius: 6,
          color: "#6845E8",
          weight: 3,
          fillColor: "#6845E8",
          fillOpacity: 1,
        }).addTo(map);
        const circle = L.circle(center, {
          radius: radiusMeters,
          color: "#6845E8",
          weight: 1.5,
          dashArray: "4 4",
          fillColor: "#6845E8",
          fillOpacity: 0.1,
        }).addTo(map);
        state.current = { map, marker: marker as unknown as import("leaflet").Marker, circle };
      } else {
        state.current.map.setView(center, state.current.map.getZoom());
        (state.current.marker as unknown as import("leaflet").CircleMarker).setLatLng(center);
        state.current.circle.setLatLng(center);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [center, radiusMeters]);

  // Keep the circle radius in sync when the slider changes.
  useEffect(() => {
    if (state.current) state.current.circle.setRadius(radiusMeters);
  }, [radiusMeters]);

  // Tear down when unmounted so the DOM slot can be reused.
  useEffect(
    () => () => {
      state.current?.map.remove();
      state.current = null;
    },
    [],
  );

  if (!center) {
    return (
      <div className="mt-1 flex aspect-[16/9] items-center justify-center rounded-xl border border-dashed border-border bg-surface/60 text-center">
        <p className="max-w-[18rem] px-4 text-xs text-muted-foreground">
          Once you pick an address or use your location, a map with the geofence appears here.
        </p>
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-xl border border-border">
      <div ref={ref} className="aspect-[16/9] w-full" />
      <div className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
        Geofence · <span className="text-primary tabular-nums">{radiusMeters} m</span>
      </div>
    </div>
  );
}
