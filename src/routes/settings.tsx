import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Save, MapPin, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { RouteError } from "@/components/route-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSalon } from "@/api";
import { useRoleGuard } from "@/lib/access";
import { currencyOptions } from "@/lib/groompulse";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Business settings · ConecktOS" },
      {
        name: "description",
        content:
          "Configure your business profile: category, location, geofence, currency and hours.",
      },
    ],
  }),
  component: SettingsPage,
  errorComponent: RouteError,
});

const SETTINGS_ROLES = ["owner", "manager"] as const;

function SettingsPage() {
  useRoleGuard(SETTINGS_ROLES);
  const { salon, updateSalon } = useSalon();

  const [name, setName] = useState(salon.name);
  const [currency, setCurrency] = useState(salon.currency);
  const [radius, setRadius] = useState(String(salon.geofence_radius_meters));
  const [lat, setLat] = useState(salon.latitude?.toString() ?? "");
  const [lng, setLng] = useState(salon.longitude?.toString() ?? "");
  const [open, setOpen] = useState(salon.open_time);
  const [close, setClose] = useState(salon.close_time);
  const [locating, setLocating] = useState(false);

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Location isn't available on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(5));
        setLng(pos.coords.longitude.toFixed(5));
        setLocating(false);
        toast.success("Location captured");
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const save = () => {
    if (!name.trim()) {
      toast.error("Business name is required");
      return;
    }
    updateSalon({
      name: name.trim(),
      currency,
      geofence_radius_meters: Number(radius) || 50,
      open_time: open,
      close_time: close,
      ...(lat ? { latitude: Number(lat) } : {}),
      ...(lng ? { longitude: Number(lng) } : {}),
    });
    toast.success("Settings saved");
  };

  return (
    <AppShell title="Business settings" subtitle="Profile, location, currency and hours">
      <div className="mx-auto max-w-2xl space-y-5">
        <section className="card-lux rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Profile</h2>
              <p className="text-sm text-muted-foreground">Your business name and currency.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Business name</Label>
              <Input
                id="s-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 bg-surface"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-cur">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="s-cur" className="h-11 bg-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="card-lux rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Location &amp; hours</h2>
              <p className="text-sm text-muted-foreground">Used for geofenced clock-ins.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={useMyLocation}
              disabled={locating}
              className="h-9"
            >
              {locating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MapPin className="size-4" />
              )}
              Use my location
            </Button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
              {lat && lng ? (
                <span className="flex items-center gap-2 text-success">
                  <MapPin className="size-4 shrink-0" />
                  Location set · {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  No location set — tap “Use my location” while you're at the business.
                </span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="s-radius">Geofence radius (metres)</Label>
                <Input
                  id="s-radius"
                  inputMode="numeric"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  placeholder="50"
                  className="h-11 bg-surface"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="s-open">Opens</Label>
                  <Input
                    id="s-open"
                    type="time"
                    value={open}
                    onChange={(e) => setOpen(e.target.value)}
                    className="h-11 bg-surface"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-close">Closes</Label>
                  <Input
                    id="s-close"
                    type="time"
                    value={close}
                    onChange={(e) => setClose(e.target.value)}
                    className="h-11 bg-surface"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="size-3.5" />
            <Link to="/privacy" className="text-primary underline-offset-4 hover:underline">
              Privacy
            </Link>
            <span>·</span>
            <Link to="/terms" className="text-primary underline-offset-4 hover:underline">
              Terms
            </Link>
          </p>
          <Button onClick={save} className="h-11 font-semibold">
            <Save className="size-4" />
            Save settings
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
