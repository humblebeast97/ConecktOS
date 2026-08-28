import { useState } from "react";
import { Check, ClipboardList, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { naira, type Service } from "@/lib/groompulse";
import { useIndustryConfig } from "@/config/industry-context";

function AddServiceDialog() {
  const config = useIndustryConfig();
  const { addService } = useServices();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [duration, setDuration] = useState("30");

  const submit = () => {
    if (!name.trim()) {
      toast.error(`Give the ${config.serviceTitle.toLowerCase()} a name`);
      return;
    }
    addService({
      name: name.trim(),
      price: Math.max(0, Number(price) || 0),
      duration_minutes: Math.max(0, Number(duration) || 0),
    });
    toast.success(`${name.trim()} added to the menu`);
    setName("");
    setPrice("0");
    setDuration("30");
    setOpen(false);
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
            Name it yourself — price and duration can be edited any time.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="svc-name">{config.serviceTitle} name</Label>
            <Input
              id="svc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Silk Press"
              className="h-11 bg-surface"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="svc-price">Price (₦)</Label>
              <Input
                id="svc-price"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-11 bg-surface"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-mins">Duration (mins)</Label>
              <Input
                id="svc-mins"
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-11 bg-surface"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} className="w-full font-semibold">
            Add to menu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ServiceRow({ service }: { service: Service }) {
  const config = useIndustryConfig();
  const { updateService, removeService } = useServices();
  const [editing, setEditing] = useState(false);
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
          />
          <Input
            value={price}
            inputMode="numeric"
            onChange={(e) => setPrice(e.target.value)}
            className="h-10 bg-background text-sm"
            aria-label="Price"
          />
          <Input
            value={duration}
            inputMode="numeric"
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
          onClick={() => {
            removeService(service.id);
            toast.success(`${service.name} removed`);
          }}
          aria-label={`Remove ${service.name}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
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

      <ul className="mt-4 space-y-2">
        {services.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            No {config.serviceTitle.toLowerCase()} options yet — add your first one.
          </li>
        ) : (
          services.map((s) => <ServiceRow key={s.id} service={s} />)
        )}
      </ul>
    </section>
  );
}
