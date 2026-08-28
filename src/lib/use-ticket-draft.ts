import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth, useServices, useStaff, useTickets } from "@/api";
import type { DraftLine, DraftUsage } from "@/lib/store";
import { useIndustryConfig } from "@/config/industry-context";
import { naira, type PaymentMethod } from "@/lib/groompulse";

export type ConsumablesMode = "auto" | "manual";

export type ClientCard = {
  name: string;
  phone: string;
  visits: number;
  spend: number;
  last: string;
};

/**
 * Owns the entire ticket-draft state for the reception ticket builder:
 * client fields, service lines, consumables mode, payment method, and the
 * derived preview + effective consumable list. Also owns the submit flow —
 * validation, createTicket call, toast, and reset.
 */
export function useTicketDraft() {
  const config = useIndustryConfig();
  const { services } = useServices();
  const { staff, profiles } = useStaff();
  const { tickets, createTicket } = useTickets();
  const { currentUser } = useAuth();

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [lookup, setLookup] = useState("");
  const [lines, setLines] = useState<DraftLine[]>(() =>
    services[0] && staff[0] ? [{ service_id: services[0].id, staff_id: staff[0].id }] : [],
  );
  const [method, setMethod] = useState<PaymentMethod>("pos");
  const [skipUsage, setSkipUsage] = useState<string[]>([]);
  const [consumablesMode, setConsumablesMode] = useState<ConsumablesMode>("auto");
  const [qtyOverride, setQtyOverride] = useState<Record<string, number>>({});
  const [autoExtras, setAutoExtras] = useState<DraftUsage[]>([]);
  const [manualEntries, setManualEntries] = useState<DraftUsage[]>([]);
  const [pendingMode, setPendingMode] = useState<ConsumablesMode | null>(null);

  const clients = useMemo<ClientCard[]>(() => {
    const map = new Map<string, ClientCard>();
    tickets.forEach((t) => {
      const key = (t.client_phone || t.client_name).toLowerCase().trim();
      if (!key) return;
      const prev = map.get(key);
      map.set(key, {
        name: t.client_name,
        phone: t.client_phone,
        visits: (prev?.visits ?? 0) + 1,
        spend: (prev?.spend ?? 0) + t.total_amount,
        last: prev && prev.last > t.created_at ? prev.last : t.created_at,
      });
    });
    return [...map.values()].sort((a, b) => (a.last < b.last ? 1 : -1));
  }, [tickets]);

  const selected = clients.find(
    (c) =>
      c.name.toLowerCase() === clientName.trim().toLowerCase() ||
      (!!clientPhone.trim() && c.phone.replace(/\s/g, "") === clientPhone.replace(/\s/g, "")),
  );

  const suggestedUsage = useMemo(() => {
    const map = new Map<string, number>();
    lines.forEach((line) => {
      const service = services.find((s) => s.id === line.service_id);
      service?.suggested_inventory.forEach((s) => {
        map.set(s.inventory_id, (map.get(s.inventory_id) ?? 0) + s.quantity);
      });
    });
    return [...map.entries()].map(([inventory_id, quantity_used]) => ({
      inventory_id,
      quantity_used,
    }));
  }, [lines, services]);

  const preview = lines.map((line) => {
    const service = services.find((s) => s.id === line.service_id);
    const member = profiles.find((p) => p.id === line.staff_id);
    if (!service || !member) {
      return { ...line, price: 0, commission: 0, serviceName: "—", staffName: "—" };
    }
    return {
      ...line,
      price: service.price,
      commission: Math.round(service.price * member.commission_rate),
      serviceName: service.name,
      staffName: member.full_name,
    };
  });
  const total = preview.reduce((s, p) => s + p.price, 0);
  const commissionTotal = preview.reduce((s, p) => s + p.commission, 0);

  const effectiveUsage: DraftUsage[] =
    consumablesMode === "auto"
      ? [
          ...suggestedUsage
            .filter((u) => !skipUsage.includes(u.inventory_id))
            .map((u) => ({
              inventory_id: u.inventory_id,
              quantity_used: qtyOverride[u.inventory_id] ?? u.quantity_used,
            })),
          ...autoExtras,
        ]
      : manualEntries;

  const applyModeSwitch = (next: ConsumablesMode) => {
    setConsumablesMode(next);
    // Clear the opposite mode's user-added entries so switching back is a clean slate.
    if (next === "auto") setManualEntries([]);
    else setAutoExtras([]);
    setPendingMode(null);
  };

  const requestModeSwitch = (next: ConsumablesMode) => {
    if (next === consumablesMode) return;
    const wouldClear = next === "auto" ? manualEntries.length > 0 : autoExtras.length > 0;
    if (wouldClear) setPendingMode(next);
    else applyModeSwitch(next);
  };

  const cancelModeSwitch = () => setPendingMode(null);
  const confirmModeSwitch = () => pendingMode && applyModeSwitch(pendingMode);

  const pickClient = (c: ClientCard) => {
    setClientName(c.name);
    setClientPhone(c.phone);
    setLookup("");
    toast.success(`${c.name} loaded`, {
      description: `${c.visits} visit(s) · ${naira(c.spend)} lifetime`,
    });
  };

  const addLookupAsNewClient = () => {
    const raw = lookup.trim();
    if (!raw) return;
    const isPhone = /^[\d+\s-]+$/.test(raw);
    if (isPhone) setClientPhone(raw);
    else setClientName(raw);
    setLookup("");
  };

  const updateLine = (idx: number, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const addLine = () => {
    if (!services[0] || !staff[0]) return;
    setLines((prev) => [...prev, { service_id: services[0].id, staff_id: staff[0].id }]);
  };

  const reset = () => {
    setClientName("");
    setClientPhone("");
    setLookup("");
    setLines(
      services[0] && staff[0] ? [{ service_id: services[0].id, staff_id: staff[0].id }] : [],
    );
    setSkipUsage([]);
    setQtyOverride({});
    setAutoExtras([]);
    setManualEntries([]);
  };

  const submit = (status: "pending" | "paid") => {
    if (!clientName.trim()) {
      toast.error(`${config.clientAssetLabel} is required`);
      return;
    }
    if (lines.length === 0) {
      toast.error(`Add at least one ${config.serviceTitle.toLowerCase()} to the ticket`);
      return;
    }
    const usage = effectiveUsage;
    createTicket({
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      payment_method: method,
      status,
      lines,
      usage,
      created_by: currentUser.id,
    });
    toast.success(status === "paid" ? "Ticket billed & paid" : "Ticket opened", {
      description: `${naira(total)} · ${usage.length} consumable(s) deducted`,
    });
    reset();
  };

  return {
    // Fields
    clientName,
    setClientName,
    clientPhone,
    setClientPhone,
    lookup,
    setLookup,
    lines,
    method,
    setMethod,
    // Consumables state
    consumablesMode,
    skipUsage,
    setSkipUsage,
    qtyOverride,
    setQtyOverride,
    autoExtras,
    setAutoExtras,
    manualEntries,
    setManualEntries,
    pendingMode,
    // Derived
    clients,
    selected,
    suggestedUsage,
    preview,
    total,
    commissionTotal,
    effectiveUsage,
    // Actions
    pickClient,
    addLookupAsNewClient,
    addLine,
    removeLine,
    updateLine,
    requestModeSwitch,
    cancelModeSwitch,
    confirmModeSwitch,
    submit,
  };
}
