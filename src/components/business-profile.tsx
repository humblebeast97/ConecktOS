import { useState } from "react";
import { Building2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSalon } from "@/api";
import { FieldError } from "@/components/field-error";
import { useSubmit } from "@/lib/use-submit";
import { LocationPicker, type LocationValue } from "@/components/location-picker";

const RADIUS_MIN = 25;
const RADIUS_MAX = 500;
const RADIUS_STEPS = [25, 50, 100, 250, 500] as const;

export function BusinessProfilePanel() {
  const { salon, updateSalon } = useSalon();

  const [name, setName] = useState(salon.name);
  const [radius, setRadius] = useState<number>(salon.geofence_radius_meters);
  const [location, setLocation] = useState<LocationValue | null>(
    salon.latitude && salon.longitude
      ? {
          latitude: salon.latitude,
          longitude: salon.longitude,
          address_label: salon.address_label ?? "Location set",
        }
      : null,
  );
  const [submitted, setSubmitted] = useState(false);
  const { isSubmitting, submit } = useSubmit();
  const nameError = submitted && !name.trim() ? "Business name is required" : null;

  const onSave = () => {
    setSubmitted(true);
    if (!name.trim()) return;
    submit(() => {
      const clampedRadius = Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, radius));
      updateSalon({
        name: name.trim(),
        geofence_radius_meters: clampedRadius,
        ...(location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
              address_label: location.address_label,
            }
          : {}),
      });
      toast.success("Business profile saved");
    });
  };

  return (
    <form
      className="card-lux space-y-5 p-5 sm:p-6"
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
            Name your business and pick where you operate so clock-ins can be geofenced.
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
        <LocationPicker value={location} radiusMeters={radius} onChange={setLocation} />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="biz-radius">Geofence radius</Label>
          <span className="font-display text-sm font-semibold tabular-nums text-primary">
            {radius} m
          </span>
        </div>
        <input
          id="biz-radius"
          type="range"
          min={RADIUS_MIN}
          max={RADIUS_MAX}
          step={5}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground">
          {RADIUS_STEPS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRadius(n)}
              className={radius === n ? "font-semibold text-primary" : "hover:text-foreground"}
            >
              {n} m
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="h-11 w-full sm:w-auto">
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {isSubmitting ? "Saving..." : "Save business profile"}
      </Button>
    </form>
  );
}
