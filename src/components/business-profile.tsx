import { useState } from "react";
import { Building2, Save } from "lucide-react";
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
            Name your business and set the location used for geofenced clock-ins.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
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
          <Label htmlFor="biz-lat">Latitude</Label>
          <Input
            id="biz-lat"
            inputMode="decimal"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="6.4318"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="biz-lng">Longitude</Label>
          <Input
            id="biz-lng"
            inputMode="decimal"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="3.4271"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="biz-radius">Geofence radius (metres)</Label>
          <Input
            id="biz-radius"
            inputMode="numeric"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            placeholder="50"
          />
        </div>
      </div>

      <Button onClick={onSave} className="h-11 w-full sm:w-auto">
        <Save className="size-4" />
        Save business profile
      </Button>
    </section>
  );
}
