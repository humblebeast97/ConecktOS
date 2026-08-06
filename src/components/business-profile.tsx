import { useState } from "react";
import { Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
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
import { useStore } from "@/lib/store";
import { getIndustryConfig, type BusinessType } from "@/config/industryConfigs";
import { saveSalonProfile } from "@/lib/salon.functions";

export const businessCategories: { value: BusinessType; label: string }[] = [
  { value: "beauty", label: "Salons, Barbershops & Spas" },
  { value: "car_wash", label: "Car Wash & Auto Detailing" },
  { value: "tailoring", label: "Tailoring & Fashion Houses" },
  { value: "nightlife", label: "Lounges, Clubs & Bars" },
  { value: "repair", label: "Electronics & Device Repair" },
];

export function BusinessProfilePanel() {
  const { salon, updateSalon } = useStore();
  const save = useServerFn(saveSalonProfile);

  const [name, setName] = useState(salon.name);
  const [businessType, setBusinessType] = useState<BusinessType | "">(
    salon.business_type ?? "",
  );
  const [radius, setRadius] = useState(String(salon.geofence_radius_meters));
  const [lat, setLat] = useState(salon.latitude?.toString() ?? "");
  const [lng, setLng] = useState(salon.longitude?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const config = businessType ? getIndustryConfig(businessType) : null;

  const onSave = async () => {
    if (!name.trim()) {
      toast.error("Business name is required");
      return;
    }
    if (!businessType) {
      toast.error("Business Category is required");
      return;
    }

    const payload = {
      name: name.trim(),
      business_type: businessType,
      latitude: lat ? Number(lat) : null,
      longitude: lng ? Number(lng) : null,
      geofence_radius_meters: Number(radius) || 50,
    };

    setSaving(true);
    updateSalon({
      name: payload.name,
      business_type: payload.business_type,
      geofence_radius_meters: payload.geofence_radius_meters,
      ...(payload.latitude !== null ? { latitude: payload.latitude } : {}),
      ...(payload.longitude !== null ? { longitude: payload.longitude } : {}),
    });
    try {
      await save({ data: payload });
      toast.success("Business profile saved");
    } catch {
      toast.info(
        "Saved on this device. Sign in as the owner to sync the business profile to the cloud.",
      );
    } finally {
      setSaving(false);
    }
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
            Your category tailors labels, tipping and stock across the app.
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

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="biz-category">
            Business Category <span className="text-primary">*</span>
          </Label>
          <Select
            value={businessType}
            onValueChange={(v) => setBusinessType(v as BusinessType)}
          >
            <SelectTrigger id="biz-category" className="h-11">
              <SelectValue placeholder="Select your business category" />
            </SelectTrigger>
            <SelectContent>
              {businessCategories.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {config ? (
            <p className="text-xs text-muted-foreground">
              Staff are called <span className="text-foreground">{config.staffPlural}</span>, jobs are{" "}
              <span className="text-foreground">{config.serviceTitle}</span>, stock tracks{" "}
              <span className="text-foreground">{config.inventoryUnitLabel}</span>.
            </p>
          ) : null}
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
        <div className="space-y-2">
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

      <Button onClick={onSave} disabled={saving} className="h-11 w-full sm:w-auto">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save business profile
      </Button>
    </section>
  );
}
