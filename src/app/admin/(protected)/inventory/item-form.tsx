"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/types/database";

import { createItemAction, updateItemAction, type ItemFormInput } from "./actions";

type ItemRow = Database["public"]["Tables"]["items"]["Row"];
const NO_CATEGORY = "none";

export function ItemForm({ item, categories }: { item?: ItemRow; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: item?.name ?? "",
    categoryId: item?.category_id ?? NO_CATEGORY,
    unit: item?.unit ?? "each",
    description: item?.description ?? "",
    tracksExpiration: item?.tracks_expiration ?? true,
    isEquipment: item?.is_equipment ?? false,
    roomParQty: String(item?.room_par_qty ?? 0),
    minBackstockQty: String(item?.min_backstock_qty ?? 0),
    unitCost: item?.unit_cost?.toString() ?? "",
    vendor: item?.vendor ?? "",
    vendorSku: item?.vendor_sku ?? "",
    isArchived: item?.is_archived ?? false,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input: ItemFormInput = { ...form, categoryId: form.categoryId === NO_CATEGORY ? null : form.categoryId };
    start(async () => {
      if (item) {
        const res = await updateItemAction(item.id, input);
        if (!res.ok) return void toast.error(res.error);
        toast.success(res.message);
      } else {
        const res = await createItemAction(input);
        if (!res.ok) return void toast.error(res.error);
        toast.success(res.message);
        router.push(`/admin/inventory/${res.data}`);
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
      </div>

      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CATEGORY}>Uncategorized</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="unit">Unit</Label>
        <Input id="unit" value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="each, pair, roll, packet…" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="par">Equipment Room par</Label>
        <Input id="par" type="number" min={0} inputMode="numeric" value={form.roomParQty} onChange={(e) => set("roomParQty", e.target.value)} />
        <p className="text-muted-foreground text-xs">Email + text the officer and board as soon as the room count reaches this. 0 = off.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="min">Backstock minimum</Label>
        <Input id="min" type="number" min={0} inputMode="numeric" value={form.minBackstockQty} onChange={(e) => set("minBackstockQty", e.target.value)} />
        <p className="text-muted-foreground text-xs">Reorder alert below this. 0 = off.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cost">Default unit cost ($)</Label>
        <Input id="cost" type="number" min={0} step="0.01" inputMode="decimal" value={form.unitCost} onChange={(e) => set("unitCost", e.target.value)} placeholder="optional" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="vendor">Vendor</Label>
          <Input id="vendor" value={form.vendor} onChange={(e) => set("vendor", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sku">Vendor SKU</Label>
          <Input id="sku" value={form.vendorSku} onChange={(e) => set("vendorSku", e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="desc">Hint for members (optional)</Label>
        <Textarea id="desc" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Shown under the item name on the member form" />
      </div>

      <div className="space-y-3 md:col-span-2">
        <Toggle id="exp" checked={form.tracksExpiration} onChange={(v) => set("tracksExpiration", v)} label="Tracks expiration dates" hint="Turn on if this item (or some brands of it) expires." />
        <Toggle id="equip" checked={form.isEquipment} onChange={(v) => set("isEquipment", v)} label="Durable equipment" hint="Can be marked out of service and repaired, instead of only disposed." />
        <Toggle id="arch" checked={form.isArchived} onChange={(v) => set("isArchived", v)} label="Archived" hint="Hidden from the member form and alerts. History is kept." />
      </div>

      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : item ? "Save changes" : "Create item"}
        </Button>
      </div>
    </form>
  );
}

function Toggle({ id, checked, onChange, label, hint }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
    </div>
  );
}
