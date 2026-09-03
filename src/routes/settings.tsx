import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Building2,
  Camera,
  Clock,
  CreditCard,
  FileText,
  Lock,
  Loader2,
  MapPin,
  Monitor,
  Moon,
  Save,
  Sun,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { RouteError } from "@/components/route-error";
import { FieldError } from "@/components/field-error";
import { useSubmit } from "@/lib/use-submit";
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
import { useAuth, useSalon, useStaff } from "@/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFrontDeskPrefs } from "@/lib/front-desk-prefs";
import {
  currencyOptions,
  paymentLabel,
  type PayrollReminderDays,
  type PaymentMethod,
} from "@/lib/groompulse";
import { useTheme, type ThemeMode } from "@/lib/theme";

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

function SettingsPage() {
  const { currentUser } = useAuth();
  const canEditBusiness = currentUser?.role === "owner" || currentUser?.role === "manager";
  const isFrontDesk = currentUser?.role === "receptionist";
  const { salon, updateSalon } = useSalon();

  const [name, setName] = useState(salon.name);
  const [currency, setCurrency] = useState(salon.currency);
  const [radius, setRadius] = useState(String(salon.geofence_radius_meters));
  const [lat, setLat] = useState(salon.latitude?.toString() ?? "");
  const [lng, setLng] = useState(salon.longitude?.toString() ?? "");
  const [open, setOpen] = useState(salon.open_time);
  const [close, setClose] = useState(salon.close_time);
  const [payrollReminder, setPayrollReminder] = useState<PayrollReminderDays>(
    salon.payroll_reminder_days ?? 7,
  );
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
    setSubmitted(true);
    if (!name.trim()) return;
    submit(() => {
      const clampedRadius = Math.min(500, Math.max(10, Number(radius) || 50));
      updateSalon({
        name: name.trim(),
        currency,
        geofence_radius_meters: clampedRadius,
        open_time: open,
        close_time: close,
        payroll_reminder_days: payrollReminder,
        ...(lat ? { latitude: Number(lat) } : {}),
        ...(lng ? { longitude: Number(lng) } : {}),
      });
      toast.success("Settings saved");
    });
  };

  return (
    <AppShell
      title={canEditBusiness ? "Business settings" : "Settings"}
      subtitle={
        canEditBusiness
          ? "Profile, location, currency and hours"
          : isFrontDesk
            ? "Billing defaults and appearance"
            : "Appearance and account preferences"
      }
    >
      <form
        className="mx-auto max-w-2xl space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (canEditBusiness) save();
        }}
      >
        <PersonalProfileSection />

        {canEditBusiness ? (
        <section className="card-lux rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Business profile</h2>
              <p className="text-sm text-muted-foreground">Your business name and currency.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">
                Business name <span className="text-primary">*</span>
              </Label>
              <Input
                id="s-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 bg-surface"
                required
                minLength={2}
                maxLength={80}
                aria-invalid={Boolean(nameError)}
                aria-describedby="s-name-error"
              />
              <FieldError id="s-name-error" message={nameError} />
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
        ) : null}

        {canEditBusiness ? (
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
                  No location set. Tap “Use my location” while you're at the business.
                </span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="s-radius">Geofence radius (metres)</Label>
                <Input
                  id="s-radius"
                  type="number"
                  inputMode="numeric"
                  min={10}
                  max={500}
                  step={5}
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  placeholder="50"
                  className="h-11 bg-surface"
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="s-open">Opens</Label>
                  <TimeInput id="s-open" value={open} onChange={setOpen} ariaLabel="Opening time" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-close">Closes</Label>
                  <TimeInput
                    id="s-close"
                    value={close}
                    onChange={setClose}
                    ariaLabel="Closing time"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
        ) : null}

        {!canEditBusiness ? <ReadOnlyLocationSection /> : null}

        <section className="card-lux rounded-2xl p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Appearance</h2>
            <p className="text-sm text-muted-foreground">
              Match the app to your device or pick a side. Applied instantly, saved to this browser.
            </p>
          </div>
          <ThemePicker />
        </section>

        {isFrontDesk ? <FrontDeskSection /> : null}

        {canEditBusiness ? (
        <section className="card-lux rounded-2xl p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Payroll reminder</h2>
            <p className="text-sm text-muted-foreground">
              When to show the "Payroll due" card on the Owner dashboard. Overdue paydays are always
              highlighted, regardless of setting.
            </p>
          </div>
          <div
            className="mt-4 flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Payroll reminder cadence"
          >
            {(
              [
                { value: 0, label: "Off" },
                { value: 3, label: "3 days before" },
                { value: 7, label: "7 days before" },
                { value: -1, label: "Always" },
              ] as const
            ).map((opt) => {
              const active = payrollReminder === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPayrollReminder(opt.value)}
                  className={
                    active
                      ? "cursor-pointer rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      : "cursor-pointer rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>
        ) : null}

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
          {canEditBusiness ? (
            <Button type="submit" disabled={isSubmitting} className="h-11 font-semibold">
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isSubmitting ? "Saving…" : "Save settings"}
            </Button>
          ) : null}
        </div>
      </form>
    </AppShell>
  );
}

/** Cross-platform time input. iOS Safari renders <input type="time"> as a
 * bare text box with no picker affordance; Android Chrome shows a native
 * chevron. This wrapper adds a clock icon on the right so both platforms
 * signal that the field opens a picker on tap. */
function TimeInput({
  id,
  value,
  onChange,
  ariaLabel,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="h-11 bg-surface pr-9"
      />
      <Clock
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function PersonalProfileSection() {
  const { currentUser } = useAuth();
  const { updateProfile } = useStaff();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(currentUser?.full_name ?? "");
  const [nameSubmitted, setNameSubmitted] = useState(false);

  if (!currentUser) return null;
  const nameError = nameSubmitted && !name.trim() ? "Name is required" : null;

  const commitName = () => {
    setNameSubmitted(true);
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentUser.full_name) return;
    updateProfile(currentUser.id, { full_name: trimmed });
    toast.success("Name updated");
  };

  const onPhotoPicked = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Photo must be 2 MB or smaller");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateProfile(currentUser.id, { avatar_url: String(reader.result) });
      toast.success("Photo updated");
    };
    reader.onerror = () => toast.error("Couldn't read that photo");
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    updateProfile(currentUser.id, { avatar_url: null });
    if (fileRef.current) fileRef.current.value = "";
    toast.success("Photo removed");
  };

  return (
    <section className="card-lux rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Camera className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Your profile</h2>
          <p className="text-sm text-muted-foreground">Name and photo shown across the app.</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-5">
        <div className="relative size-20 shrink-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Change profile photo"
            className="group block size-20 cursor-pointer overflow-hidden rounded-full shadow-md ring-1 ring-border transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="size-20">
              {currentUser.avatar_url ? (
                <AvatarImage src={currentUser.avatar_url} alt={currentUser.full_name} />
              ) : null}
              <AvatarFallback className="bg-gradient-primary text-2xl font-bold text-primary-foreground">
                {initialsOf(currentUser.full_name)}
              </AvatarFallback>
            </Avatar>
          </button>
          <span
            aria-hidden
            className="pointer-events-none absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full border-2 border-background bg-card text-foreground shadow"
          >
            <Camera className="size-3.5" />
          </span>
          {currentUser.avatar_url ? (
            <button
              type="button"
              onClick={clearPhoto}
              aria-label="Remove photo"
              title="Remove photo"
              className="absolute -right-1 -top-1 grid size-6 cursor-pointer place-items-center rounded-full border border-border bg-card text-destructive shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3" />
            </button>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPhotoPicked(file);
            }}
          />
        </div>
        <div className="min-w-0 text-sm">
          <p className="font-medium">Tap your photo to change it.</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            JPG or PNG, up to 2 MB. Your initials show when no photo is set.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-1.5">
        <Label htmlFor="p-name">Full name</Label>
        <Input
          id="p-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="h-11 bg-surface"
          minLength={2}
          maxLength={80}
          aria-invalid={Boolean(nameError)}
          aria-describedby="p-name-error"
        />
        <FieldError id="p-name-error" message={nameError} />
      </div>
    </section>
  );
}

function ReadOnlyLocationSection() {
  const { salon } = useSalon();
  const hasLocation = salon.latitude != null && salon.longitude != null;
  return (
    <section className="card-lux rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <MapPin className="size-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Location &amp; hours</h2>
          <p className="text-sm text-muted-foreground">Used for geofenced clock-ins.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Lock className="size-3" />
          Read only
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
        {hasLocation ? (
          <span className="flex items-center gap-2 text-success">
            <MapPin className="size-4 shrink-0" />
            {salon.name} · {salon.latitude!.toFixed(4)}, {salon.longitude!.toFixed(4)}
          </span>
        ) : (
          <span className="text-muted-foreground">No business location set yet.</span>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Geofence radius</Label>
          <Input readOnly value={`${salon.geofence_radius_meters} metres`} className="h-11 bg-muted/40 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Opens</Label>
            <Input readOnly value={salon.open_time} className="h-11 bg-muted/40 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label>Closes</Label>
            <Input readOnly value={salon.close_time} className="h-11 bg-muted/40 text-muted-foreground" />
          </div>
        </div>
      </div>

      <p className="mt-3 rounded-lg border-l-2 border-lime bg-lime/20 px-3 py-2 text-xs text-foreground">
        Only the business owner can change these. Ask them if the location or opening hours have moved.
      </p>
    </section>
  );
}

function FrontDeskSection() {
  const { prefs, update } = useFrontDeskPrefs();
  const options: PaymentMethod[] = ["pos", "cash", "bank_transfer"];
  return (
    <section className="card-lux rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <CreditCard className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Front desk preferences</h2>
          <p className="text-sm text-muted-foreground">
            Defaults for the tickets you bill on this device.
          </p>
        </div>
      </div>
      <div className="mt-5">
        <p className="text-sm font-medium">Default payment method</p>
        <p className="text-xs text-muted-foreground">
          Pre-selected when you open a new ticket. Change per-ticket at billing time.
        </p>
        <div
          className="mt-3 flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Default payment method"
        >
          {options.map((m) => {
            const active = prefs.defaultPaymentMethod === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  update({ defaultPaymentMethod: m });
                  toast.success(`Default set to ${paymentLabel[m]}`);
                }}
                className={
                  active
                    ? "cursor-pointer rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    : "cursor-pointer rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                }
              >
                {paymentLabel[m]}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ThemePicker() {
  const { mode, setMode, effective } = useTheme();
  const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <div className="mt-4">
      <div
        role="radiogroup"
        aria-label="Theme"
        className="inline-flex rounded-full border border-border bg-muted p-1"
      >
        {options.map((o) => {
          const Icon = o.icon;
          const active = mode === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(o.value)}
              className={
                active
                  ? "flex cursor-pointer items-center gap-1.5 rounded-full bg-card px-4 py-1.5 text-xs font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  : "flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              }
            >
              <Icon className="size-3.5" />
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Currently showing <span className="font-medium text-foreground">{effective}</span> mode
        {mode === "system" ? " (following your device)" : ""}.
      </p>
    </div>
  );
}
