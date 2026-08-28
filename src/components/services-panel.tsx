import { useState } from "react";
import { Check, ClipboardList, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/app-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useServices } from "@/api";
import { FieldError } from "@/components/field-error";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useSubmit } from "@/lib/use-submit";
import { naira, type Service } from "@/lib/groompulse";
import { useIndustryConfig } from "@/config/industry-context";

function AddServiceDialog() {
  const config = useIndustryConfig();
  const { addService } = useServices();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [duration, setDuration] = useState("30");
  const [submitted, setSubmitted] = useState(false);
  const { isSubmitting, submit: guarded } = useSubmit();
  const nameError =
    submitted && !name.trim() ? `Give the ${config.serviceTitle.toLowerCase()} a name` : null;

  const submit = () => {
    setSubmitted(true);
    if (!name.trim()) return;
    guarded(() => {
      addService({
        name: name.trim(),
        price: Math.max(0, Number(price) || 0),
        duration_minutes: Math.max(0, Number(duration) || 0),
      });
      toast.success(`${name.trim()} added to the menu`);
      setName("");
      setPrice("0");
      setDuration("30");
      setSubmitted(false);
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 px-3 text-xs">
          <Plus className="size-3.5" />
          Add {config.serviceTitle.toLowerCase()}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a {config.serviceTitle.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Name it yourself. Price and duration can be edited any time.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="svc-name">
                {config.serviceTitle} name <span className="text-primary">*</span>
              </Label>
              <Input
                id="svc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Silk Press"
                className="h-11 bg-surface"
                required
                minLength={1}
                maxLength={60}
                aria-invalid={Boolean(nameError)}
                aria-describedby="svc-name-error"
              />
              <FieldError id="svc-name-error" message={nameError} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="svc-price">Price (₦)</Label>
                <Input
                  id="svc-price"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-11 bg-surface"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-mins">Duration (mins)</Label>
                <Input
                  id="svc-mins"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={480}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="h-11 bg-surface"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full font-semibold">
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isSubmitting ? "Adding…" : "Add to menu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ServiceRow({ service }: { service: Service }) {
  const config = useIndustryConfig();
  const { updateService, removeService } = useServices();
  const [editing, setEditing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [name, setName] = useState(service.name);
  const [price, setPrice] = useState(String(service.price));
  const [duration, setDuration] = useState(String(service.duration_minutes));

  const save = () => {
    if (!name.trim()) {
      toast.error(`${config.serviceTitle} name can't be empty`);
      return;
    }
    updateService(service.id, {
      name: name.trim(),
      price: Math.max(0, Number(price) || 0),
      duration_minutes: Math.max(0, Number(duration) || 0),
    });
    setEditing(false);
    toast.success(`${config.serviceTitle} updated`);
  };

  const cancel = () => {
    setName(service.name);
    setPrice(String(service.price));
    setDuration(String(service.duration_minutes));
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="rounded-xl border border-primary/40 bg-surface p-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 bg-background text-sm"
            required
            minLength={1}
            maxLength={60}
          />
          <Input
            value={price}
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            onChange={(e) => setPrice(e.target.value)}
            className="h-10 bg-background text-sm"
            aria-label="Price"
          />
          <Input
            value={duration}
            type="number"
            inputMode="numeric"
            min={0}
            max={480}
            step={5}
            onChange={(e) => setDuration(e.target.value)}
            className="h-10 bg-background text-sm"
            aria-label="Duration in minutes"
          />
          <div className="flex gap-1 justify-self-end">
            <Button
              size="icon"
              variant="ghost"
              className="text-success"
              onClick={save}
              aria-label="Save changes"
            >
              <Check className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground"
              onClick={cancel}
              aria-label="Cancel editing"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{service.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {naira(service.price)} · {service.duration_minutes} mins
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-primary"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${service.name}`}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => setConfirmingRemove(true)}
          aria-label={`Remove ${service.name}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <ConfirmDialog
        open={confirmingRemove}
        onOpenChange={setConfirmingRemove}
        title={`Remove ${service.name}?`}
        description={`This ${config.serviceTitle.toLowerCase()} will disappear from the billing menu. Past tickets that used it are kept.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          removeService(service.id);
          toast.success(`${service.name} removed`);
        }}
      />
    </li>
  );
}

export function ServicesPanel() {
  const config = useIndustryConfig();
  const { services } = useServices();

  return (
    <section className="card-lux rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ClipboardList className="size-4 text-primary" />
            {config.serviceTitle} menu
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add {config.serviceTitle.toLowerCase()} options manually, rename them, and set price and
            duration.
          </p>
        </div>
        <AddServiceDialog />
      </div>

      {services.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={ClipboardList}
            title={`No ${config.serviceTitle.toLowerCase()} options yet`}
            description={`Add your first ${config.serviceTitle.toLowerCase()}. You can set price and duration from the roster.`}
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {services.map((s) => (
            <ServiceRow key={s.id} service={s} />
          ))}
        </ul>
      )}
    </section>
  );
}
