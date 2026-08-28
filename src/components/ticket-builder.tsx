import { useState } from "react";
import { CheckCircle2, Package, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/app-shell";
import { LoadMore } from "@/components/load-more";
import { usePaginated } from "@/lib/paginate";
import { useInventory, useServices, useStaff } from "@/api";
import type { DraftUsage } from "@/lib/store";
import { useTicketDraft } from "@/lib/use-ticket-draft";
import { useIndustryConfig } from "@/config/industry-context";
import { naira, paymentLabel, timeOf, type PaymentMethod } from "@/lib/groompulse";

/**
 * The full "Quick service billing" card — client lookup, service lines,
 * consumables, totals, payment method, and open/pay actions. All state lives
 * in the useTicketDraft hook so the route file stays thin.
 */
export function TicketBuilder() {
  const config = useIndustryConfig();
  const { services } = useServices();
  const { staff } = useStaff();
  const { inventory } = useInventory();
  const draft = useTicketDraft();

  const q = draft.lookup.trim().toLowerCase();
  const allMatches = q
    ? draft.clients.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
      )
    : draft.clients.slice(0, 4);

  const {
    items: matches,
    hasMore: hasMoreMatches,
    loadMore: loadMoreMatches,
    shown: shownMatches,
    total: totalMatches,
  } = usePaginated(allMatches, 10);

  return (
    <>
      <section className="card-lux rounded-2xl p-5">
        <h2 className="text-lg font-bold">Quick {config.serviceTitle.toLowerCase()} billing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Commission splits are calculated automatically from each {config.staffTitle.toLowerCase()}{" "}
          rate.
        </p>

        {services.length === 0 || staff.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={Package}
              title={
                services.length === 0
                  ? `No ${config.serviceTitle.toLowerCase()} set up yet`
                  : `No ${config.staffPlural.toLowerCase()} yet`
              }
              description={
                services.length === 0
                  ? "An owner needs to add services before you can bill a ticket."
                  : "Add a team member before billing so commissions can be assigned."
              }
            />
          </div>
        ) : null}

        <div className="mt-4 rounded-xl border border-border bg-surface p-3">
          <Label htmlFor="lookup" className="text-xs text-muted-foreground">
            Find an existing client
          </Label>
          <div className="relative mt-1.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="lookup"
              value={draft.lookup}
              onChange={(e) => draft.setLookup(e.target.value)}
              placeholder="Search by phone or name"
              className="h-11 bg-background pl-9"
            />
          </div>
          {draft.clients.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              No clients yet — the first ticket you bill starts the client book.
            </p>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {totalMatches === 0 ? (
                  <li className="text-xs text-muted-foreground">
                    No match for “{draft.lookup}”. Type the details below to add a new client.
                  </li>
                ) : (
                  matches.map((c) => (
                    <li key={c.phone || c.name}>
                      <button
                        type="button"
                        onClick={() => draft.pickClient(c)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left hover:border-primary/50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{c.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {c.phone || "No phone"} · last {timeOf(c.last)}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {c.visits} visit{c.visits === 1 ? "" : "s"}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
              {q && totalMatches > 0 ? (
                <LoadMore
                  hasMore={hasMoreMatches}
                  onLoadMore={loadMoreMatches}
                  shown={shownMatches}
                  total={totalMatches}
                />
              ) : null}
              {draft.lookup.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={draft.addLookupAsNewClient}
                >
                  <UserPlus className="size-4" />
                  Add “{draft.lookup.trim()}” as new client
                </Button>
              ) : null}
            </>
          )}
        </div>

        {draft.selected ? (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="border-primary/40 text-primary">
              Returning client
            </Badge>
            {draft.selected.visits} visit{draft.selected.visits === 1 ? "" : "s"} ·{" "}
            {naira(draft.selected.spend)} lifetime spend
          </p>
        ) : draft.clientName.trim() ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">New client</Badge>
            Will be saved to the client book on billing.
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="client">
              {config.clientAssetLabel} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client"
              required
              aria-required="true"
              value={draft.clientName}
              onChange={(e) => draft.setClientName(e.target.value)}
              placeholder={config.clientAssetLabel}
              className="h-11 bg-surface"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={draft.clientPhone}
              onChange={(e) => draft.setClientPhone(e.target.value)}
              placeholder="0803 000 0000"
              className="h-11 bg-surface"
            />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {draft.lines.map((line, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
            >
              <Select
                value={line.service_id}
                onValueChange={(v) => draft.updateLine(idx, { service_id: v })}
              >
                <SelectTrigger className="h-11 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {naira(s.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={line.staff_id}
                onValueChange={(v) => draft.updateLine(idx, { staff_id: v })}
              >
                <SelectTrigger className="h-11 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} · {Math.round(s.commission_rate * 100)}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove this service line"
                className="justify-self-end text-muted-foreground hover:text-destructive"
                disabled={draft.lines.length === 1}
                onClick={() => draft.removeLine(idx)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!services[0] || !staff[0]}
            onClick={draft.addLine}
          >
            <Plus className="size-4" />
            Add {config.serviceTitle.toLowerCase()}
          </Button>
        </div>

        {config.showInventory ? (
          <ConsumablesPanel
            mode={draft.consumablesMode}
            onModeSwitch={draft.requestModeSwitch}
            suggested={draft.suggestedUsage}
            skipUsage={draft.skipUsage}
            setSkipUsage={draft.setSkipUsage}
            qtyOverride={draft.qtyOverride}
            setQtyOverride={draft.setQtyOverride}
            autoExtras={draft.autoExtras}
            setAutoExtras={draft.setAutoExtras}
            manualEntries={draft.manualEntries}
            setManualEntries={draft.setManualEntries}
            inventory={inventory}
          />
        ) : null}

        <div className="mt-5 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ticket total</span>
            <span className="font-display text-xl font-bold text-primary">
              {naira(draft.total)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{config.staffPlural} commissions payable</span>
            <span>{naira(draft.commissionTotal)}</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(["pos", "bank_transfer", "cash"] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => draft.setMethod(m)}
                aria-pressed={draft.method === m}
                className={
                  draft.method === m
                    ? "cursor-pointer rounded-xl border-2 border-primary/70 bg-primary/10 px-2 py-2.5 text-xs font-semibold text-primary transition-colors"
                    : "cursor-pointer rounded-xl border border-border px-2 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                }
              >
                {paymentLabel[m]}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="h-12" onClick={() => draft.submit("pending")}>
              Open ticket
            </Button>
            <Button className="h-12 font-semibold" onClick={() => draft.submit("paid")}>
              <CheckCircle2 className="size-4" />
              Bill and mark paid
            </Button>
          </div>
        </div>
      </section>

      <Dialog
        open={draft.pendingMode !== null}
        onOpenChange={(o) => (!o ? draft.cancelModeSwitch() : null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Switch consumables mode?</DialogTitle>
            <DialogDescription>
              This will clear the {draft.pendingMode === "auto" ? "manual" : "extra"} consumables
              you've added on this ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={draft.cancelModeSwitch}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={draft.confirmModeSwitch}>
              Switch &amp; clear
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type ConsumablesPanelProps = {
  mode: "auto" | "manual";
  onModeSwitch: (next: "auto" | "manual") => void;
  suggested: DraftUsage[];
  skipUsage: string[];
  setSkipUsage: React.Dispatch<React.SetStateAction<string[]>>;
  qtyOverride: Record<string, number>;
  setQtyOverride: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  autoExtras: DraftUsage[];
  setAutoExtras: React.Dispatch<React.SetStateAction<DraftUsage[]>>;
  manualEntries: DraftUsage[];
  setManualEntries: React.Dispatch<React.SetStateAction<DraftUsage[]>>;
  inventory: ReturnType<typeof useInventory>["inventory"];
};

function ConsumablesPanel({
  mode,
  onModeSwitch,
  suggested,
  skipUsage,
  setSkipUsage,
  qtyOverride,
  setQtyOverride,
  autoExtras,
  setAutoExtras,
  manualEntries,
  setManualEntries,
  inventory,
}: ConsumablesPanelProps) {
  const [pickerId, setPickerId] = useState("");
  const [pickerQty, setPickerQty] = useState("1");

  const activeExtras = mode === "auto" ? autoExtras : manualEntries;
  const setActiveExtras = mode === "auto" ? setAutoExtras : setManualEntries;
  const usedIds = new Set([
    ...(mode === "auto" ? suggested.map((s) => s.inventory_id) : []),
    ...activeExtras.map((e) => e.inventory_id),
  ]);
  const addable = inventory.filter((i) => !usedIds.has(i.id));

  const addPickedItem = () => {
    if (!pickerId) return;
    const qty = Number(pickerQty) || 1;
    setActiveExtras((prev) => [...prev, { inventory_id: pickerId, quantity_used: qty }]);
    setPickerId("");
    setPickerQty("1");
  };

  const nothingShown =
    mode === "manual"
      ? manualEntries.length === 0
      : suggested.length === 0 && autoExtras.length === 0;

  return (
    <div className="mt-5 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Package className="size-4 text-primary" />
          Consumables to deduct
        </p>
        <div
          role="tablist"
          aria-label="Consumables mode"
          className="flex gap-0.5 rounded-full border border-border bg-background p-0.5"
        >
          {(["auto", "manual"] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onModeSwitch(m)}
                className={
                  active
                    ? "cursor-pointer rounded-full bg-gradient-gold px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-foreground"
                    : "cursor-pointer rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {mode === "auto"
          ? "Pre-filled from the services on this ticket — edit quantity or uncheck to skip."
          : "Add exactly what was used on this ticket."}
      </p>

      <div className="mt-3 space-y-1.5">
        {mode === "auto"
          ? suggested.map((u) => {
              const item = inventory.find((i) => i.id === u.inventory_id);
              const skipped = skipUsage.includes(u.inventory_id);
              const qty = qtyOverride[u.inventory_id] ?? u.quantity_used;
              return (
                <ConsumableRow
                  key={u.inventory_id}
                  itemName={item?.item_name ?? "Unknown"}
                  stockHint={item ? `${item.quantity} in stock` : ""}
                  unit={item?.unit ?? ""}
                  qty={qty}
                  onQtyChange={(v) => setQtyOverride((prev) => ({ ...prev, [u.inventory_id]: v }))}
                  skipped={skipped}
                  onToggleSkip={() =>
                    setSkipUsage((prev) =>
                      skipped
                        ? prev.filter((id) => id !== u.inventory_id)
                        : [...prev, u.inventory_id],
                    )
                  }
                />
              );
            })
          : null}

        {activeExtras.map((e, idx) => {
          const item = inventory.find((i) => i.id === e.inventory_id);
          return (
            <ConsumableRow
              key={`x-${e.inventory_id}-${idx}`}
              itemName={item?.item_name ?? "Unknown"}
              stockHint={item ? `${item.quantity} in stock` : ""}
              unit={item?.unit ?? ""}
              qty={e.quantity_used}
              onQtyChange={(v) =>
                setActiveExtras((prev) =>
                  prev.map((p, i) => (i === idx ? { ...p, quantity_used: v } : p)),
                )
              }
              onRemove={() => setActiveExtras((prev) => prev.filter((_, i) => i !== idx))}
            />
          );
        })}

        {nothingShown ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            {mode === "manual"
              ? "Nothing added yet — pick a consumable below."
              : "No suggestions for the current services."}
          </p>
        ) : null}
      </div>

      {addable.length > 0 ? (
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_5rem_auto] gap-2 rounded-lg border border-dashed border-border p-2">
          <Select value={pickerId} onValueChange={setPickerId}>
            <SelectTrigger className="h-9 bg-background text-xs">
              <SelectValue
                placeholder={mode === "manual" ? "+ Add a consumable" : "+ Add another"}
              />
            </SelectTrigger>
            <SelectContent>
              {addable.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.item_name} · {i.quantity} {i.unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            inputMode="decimal"
            value={pickerQty}
            onChange={(e) => setPickerQty(e.target.value)}
            placeholder="Qty"
            className="h-9 bg-background text-xs"
          />
          <Button size="sm" className="h-9" disabled={!pickerId} onClick={addPickedItem}>
            Add
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ConsumableRow({
  itemName,
  stockHint,
  unit,
  qty,
  onQtyChange,
  skipped,
  onToggleSkip,
  onRemove,
}: {
  itemName: string;
  stockHint: string;
  unit: string;
  qty: number;
  onQtyChange: (v: number) => void;
  skipped?: boolean;
  onToggleSkip?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div
      className={
        skipped
          ? "flex items-center gap-3 rounded-md px-1 py-1.5 text-xs opacity-50"
          : "flex items-center gap-3 rounded-md px-1 py-1.5 text-xs"
      }
    >
      <div className="min-w-0 flex-1">
        <p className={skipped ? "truncate line-through" : "truncate font-medium text-foreground"}>
          {itemName}
        </p>
        {stockHint ? (
          <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
            {stockHint}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1">
        <Input
          inputMode="decimal"
          value={String(qty)}
          disabled={skipped}
          onChange={(e) => onQtyChange(Number(e.target.value) || 0)}
          className="h-6 w-12 border-0 bg-transparent p-0 text-right text-xs tabular-nums shadow-none focus-visible:ring-0"
        />
        <span className="text-[10px] text-muted-foreground">{unit}</span>
      </div>
      {onToggleSkip ? (
        <button
          type="button"
          onClick={onToggleSkip}
          aria-label={skipped ? "Restore" : "Skip"}
          className="grid size-7 cursor-pointer place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          {skipped ? "↺" : "×"}
        </button>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="grid size-7 cursor-pointer place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
