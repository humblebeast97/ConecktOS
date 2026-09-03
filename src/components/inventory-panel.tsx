import { useState } from "react";
import { Check, Loader2, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useInventory } from "@/api";
import { FieldError } from "@/components/field-error";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/app-shell";
import { useSubmit } from "@/lib/use-submit";
import { lowStock } from "@/lib/reports";
import type { InventoryItem } from "@/lib/groompulse";
import { useIndustryConfig } from "@/config/industry-context";

function AddItemDialog() {
  const { addInventoryItem } = useInventory();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("bottles");
  const [qty, setQty] = useState("0");
  const [reorder, setReorder] = useState("0");
  const [submitted, setSubmitted] = useState(false);
  const { isSubmitting, submit: guarded } = useSubmit();
  const nameError = submitted && !name.trim() ? "Give the item a name" : null;

  const submit = () => {
    setSubmitted(true);
    if (!name.trim()) return;
    guarded(() => {
      addInventoryItem({
        item_name: name.trim(),
        quantity: Math.max(0, Number(qty) || 0),
        unit: unit.trim() || "units",
        reorder_level: Math.max(0, Number(reorder) || 0),
      });
      toast.success(`${name.trim()} added to inventory`);
      setName("");
      setQty("0");
      setReorder("0");
      setUnit("bottles");
      setSubmitted(false);
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 px-3 text-xs">
          <Plus className="size-3.5" />
          Add item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add inventory item</DialogTitle>
          <DialogDescription>
            Log a consumable manually. Stock, unit and the reorder threshold.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="inv-name">
                Item name <span className="text-primary">*</span>
              </Label>
              <Input
                id="inv-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Edge Control Gel"
                required
                minLength={1}
                maxLength={60}
                aria-invalid={Boolean(nameError)}
                aria-describedby="inv-name-error"
              />
              <FieldError id="inv-name-error" message={nameError} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="inv-qty">Quantity</Label>
                <Input
                  id="inv-qty"
                  type="number"
                  min={0}
                  step={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inv-unit">Unit</Label>
                <Input
                  id="inv-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="bottles"
                  maxLength={20}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inv-reorder">Reorder at</Label>
                <Input
                  id="inv-reorder"
                  type="number"
                  min={0}
                  step={1}
                  value={reorder}
                  onChange={(e) => setReorder(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isSubmitting ? "Saving…" : "Save item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const RESTOCK_PRESETS = [1, 5, 10, 25] as const;
const RESTOCK_MAX = 9999;

function ItemRow({ item }: { item: InventoryItem }) {
  const { addInventoryStock, updateInventoryItem, removeInventoryItem } = useInventory();
  const [editing, setEditing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [restocking, setRestocking] = useState(false);
  const [restockQty, setRestockQty] = useState("5");
  const parsedRestock = Math.floor(Number(restockQty));
  const validRestock =
    Number.isFinite(parsedRestock) && parsedRestock > 0 && parsedRestock <= RESTOCK_MAX;
  const [draft, setDraft] = useState({
    item_name: item.item_name,
    quantity: String(item.quantity),
    unit: item.unit,
    reorder_level: String(item.reorder_level),
  });

  const commitRestock = () => {
    if (!validRestock) return;
    addInventoryStock(item.id, parsedRestock);
    toast.success(`Restocked ${item.item_name} (+${parsedRestock} ${item.unit})`);
    setRestocking(false);
    setRestockQty("5");
  };

  const isLow = item.quantity <= item.reorder_level;
  const pct = Math.min(
    100,
    Math.round((item.quantity / Math.max(1, item.reorder_level * 2)) * 100),
  );

  const save = () => {
    if (!draft.item_name.trim()) {
      toast.error("Item name can't be empty");
      return;
    }
    const qty = Number(draft.quantity);
    const reorder = Number(draft.reorder_level);
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error("Quantity must be zero or higher");
      return;
    }
    if (!Number.isFinite(reorder) || reorder < 0) {
      toast.error("Reorder level must be zero or higher");
      return;
    }
    updateInventoryItem(item.id, {
      item_name: draft.item_name.trim(),
      quantity: qty,
      unit: draft.unit.trim() || "units",
      reorder_level: reorder,
    });
    setEditing(false);
    toast.success("Inventory updated");
  };

  if (editing) {
    return (
      <li className="rounded-xl border border-border/60 bg-muted/20 p-3">
        <Input
          value={draft.item_name}
          onChange={(e) => setDraft((d) => ({ ...d, item_name: e.target.value }))}
          className="h-8 text-sm"
          aria-label="Item name"
        />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Input
            type="number"
            min={0}
            value={draft.quantity}
            onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
            className="h-8 text-sm"
            aria-label="Quantity"
          />
          <Input
            value={draft.unit}
            onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
            className="h-8 text-sm"
            aria-label="Unit"
          />
          <Input
            type="number"
            min={0}
            value={draft.reorder_level}
            onChange={(e) => setDraft((d) => ({ ...d, reorder_level: e.target.value }))}
            className="h-8 text-sm"
            aria-label="Reorder level"
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" className="h-7 px-2 text-xs" onClick={save}>
            <Check className="size-3" />
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setEditing(false)}
          >
            <X className="size-3" />
            Cancel
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-7 px-2 text-xs text-destructive"
            onClick={() => setConfirmingRemove(true)}
          >
            <Trash2 className="size-3" />
            Delete
          </Button>
        </div>
        <ConfirmDialog
          open={confirmingRemove}
          onOpenChange={setConfirmingRemove}
          title={`Delete ${item.item_name}?`}
          description={`This inventory item and its stock (${item.quantity} ${item.unit}) will be removed. Past ticket usage is kept.`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            removeInventoryItem(item.id);
            toast.success(`${item.item_name} removed`);
          }}
        />
      </li>
    );
  }

  return (
    <li>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium">{item.item_name}</span>
        <span
          className={
            isLow
              ? "shrink-0 text-xs font-bold text-destructive"
              : "shrink-0 text-xs text-muted-foreground"
          }
        >
          {item.quantity} {item.unit}
          {isLow ? " · LOW" : ""}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <Progress value={pct} className="h-1.5" />
        <Button
          size="sm"
          variant={restocking ? "default" : "ghost"}
          className={
            restocking
              ? "h-7 shrink-0 px-2 text-xs"
              : "h-7 shrink-0 px-2 text-xs text-muted-foreground"
          }
          aria-expanded={restocking}
          onClick={() => setRestocking((v) => !v)}
        >
          <Plus className="size-3" />
          Restock
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 shrink-0 text-muted-foreground"
          aria-label={`Edit ${item.item_name}`}
          onClick={() => {
            setDraft({
              item_name: item.item_name,
              quantity: String(item.quantity),
              unit: item.unit,
              reorder_level: String(item.reorder_level),
            });
            setEditing(true);
          }}
        >
          <Pencil className="size-3" />
        </Button>
      </div>
      {restocking ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-surface/60 p-2">
          <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-0.5">
            {RESTOCK_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRestockQty(String(n))}
                className={
                  parsedRestock === n
                    ? "rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary"
                    : "rounded-full px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground hover:text-foreground"
                }
              >
                +{n}
              </button>
            ))}
          </div>
          <div className="flex min-w-[110px] flex-1 items-center rounded-lg border border-border bg-surface pr-2 focus-within:border-primary">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={RESTOCK_MAX}
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitRestock();
                } else if (e.key === "Escape") {
                  setRestocking(false);
                  setRestockQty("5");
                }
              }}
              aria-label={`Quantity to add for ${item.item_name}`}
              autoFocus
              className="h-8 border-0 bg-transparent px-2 text-right text-xs tabular-nums focus-visible:ring-0"
            />
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">{item.unit}</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs text-muted-foreground"
            onClick={() => {
              setRestocking(false);
              setRestockQty("5");
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 px-3 text-xs"
            disabled={!validRestock}
            onClick={commitRestock}
          >
            Add {validRestock ? parsedRestock : ""}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export function InventoryPanel() {
  const config = useIndustryConfig();
  const { inventory } = useInventory();
  const low = lowStock(inventory);

  return (
    <section id="inventory" className="card-lux scroll-mt-24 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="size-4 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-bold">Inventory</h2>
            <p className="text-xs text-muted-foreground">{config.inventoryUnitLabel}</p>
          </div>
        </div>
        <AddItemDialog />
      </div>
      {inventory.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Package}
            title="No items yet"
            description="Add your first consumable so ticket-usage can deduct stock automatically."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {inventory.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </ul>
      )}
      {low.length > 0 ? (
        <p className="mt-4 rounded-lg bg-destructive/15 px-3 py-2 text-xs font-medium text-destructive">
          {low.length} item(s) at or below reorder level.
        </p>
      ) : null}
    </section>
  );
}
