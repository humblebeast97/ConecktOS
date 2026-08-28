import { useState } from "react";
import { Building2, Save, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSalon } from "@/api";
import { FieldError } from "@/components/field-error";
import { useSubmit } from "@/lib/use-submit";

export function BusinessProfilePanel() {
  const { salon, updateSalon } = useSalon();

  const [name, setName] = useState(salon.name);
  const [radius, setRadius] = useState(String(salon.geofence_radius_meters));
  const [lat, setLat] = useState(salon.latitude?.toString() ?? "");
  const [lng, setLng] = useState(salon.longitude?.toString() ?? "");
  const [locating, setLocating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { isSubmitting, submit } = useSubmit();
  const nameError = submitted && !name.trim() ? "Business name is required" : null;

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
    setSubmitted(true);
    if (!name.trim()) return;
    submit(() => {
      const clampedRadius = Math.min(500, Math.max(10, Number(radius) || 50));
      updateSalon({
        name: name.trim(),
        geofence_radius_meters: clampedRadius,
        ...(lat ? { latitude: Number(lat) } : {}),
        ...(lng ? { longitude: Number(lng) } : {}),
      });
      toast.success("Business profile saved");
    });
  };

  return (
    <form
      className="card-lux p-5 sm:p-6 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
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
          placeholder="e.g. Central Studio"
          required
          minLength={2}
          maxLength={80}
          aria-invalid={Boolean(nameError)}
          aria-describedby="biz-name-error"
        />
        <FieldError id="biz-name-error" message={nameError} />
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
          type="number"
          inputMode="numeric"
          min={10}
          max={500}
          step={5}
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          placeholder="50"
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="h-11 w-full sm:w-auto">
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {isSubmitting ? "Saving…" : "Save business profile"}
      </Button>
    </form>
  );
}
