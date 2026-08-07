import { useState } from "react";
import { Building2, Save, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";

export function BusinessProfilePanel() {
  const { salon, updateSalon } = useStore();

  const [name, setName] = useState(salon.name);
  const [radius, setRadius] = useState(String(salon.geofence_radius_meters));
  const [lat, setLat] = useState(salon.latitude?.toString() ?? "");
  const [lng, setLng] = useState(salon.longitude?.toString() ?? "");
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
        toast.success("Business location captured");
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location — allow location access and try again");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const onSave = () => {
    if (!name.trim()) {
      toast.error("Business name is required");
      return;
    }
    updateSalon({
      name: name.trim(),
      geofence_radius_meters: Number(radius) || 50,
      ...(lat ? { latitude: Number(lat) } : {}),
      ...(lng ? { longitude: Number(lng) } : {}),
    });
    toast.success("Business profile saved");
  };

  return (
    <section className="card-lux p-5 sm:p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Building2 className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Business setup</h2>
          <p className="text-sm text-muted-foreground">
            Name your business and set its location for geofenced clock-ins.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="biz-name">
          Business name <span className="text-primary">*</span>
        </Label>
        <Input
          id="biz-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Kings & Queens Grooming Lounge"
        />
      </div>

      <div className="space-y-2">
        <Label>Business location</Label>
        <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          {lat && lng ? (
            <span className="flex items-center gap-2 text-success">
              <MapPin className="size-4 shrink-0" />
              Location set · {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
            </span>
          ) : (
            <span className="text-muted-foreground">
              Stand at your business and tap “Use my location”.
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={useMyLocation}
          disabled={locating}
          className="h-11 w-full sm:w-auto"
        >
          {locating ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
          Use my location
        </Button>
      </div>

      <div className="space-y-2 sm:max-w-xs">
        <Label htmlFor="biz-radius">Geofence radius (metres)</Label>
        <Input
          id="biz-radius"
          inputMode="numeric"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          placeholder="50"
        />
      </div>

      <Button onClick={onSave} className="h-11 w-full sm:w-auto">
        <Save className="size-4" />
        Save business profile
      </Button>
    </section>
  );
}
