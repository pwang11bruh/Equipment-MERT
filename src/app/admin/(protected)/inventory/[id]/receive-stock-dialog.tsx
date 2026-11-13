"use client";

import { useState, useTransition } from "react";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { InventoryLocation } from "@/types/domain";

import { receiveStockAction } from "../actions";

export function ReceiveStockDialog({
  itemId,
  unit,
  tracksExpiration,
  defaultCost,
}: {
  itemId: string;
  unit: string;
  tracksExpiration: boolean;
  defaultCost: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState<InventoryLocation>("backstock");
  const [expirationDate, setExpirationDate] = useState("");
  const [noExpiry, setNoExpiry] = useState(false);
  const [lotNumber, setLotNumber] = useState("");
  const [unitCost, setUnitCost] = useState(defaultCost?.toString() ?? "");
  const [notes, setNotes] = useState("");

  function reset() {
    setQuantity("");
    setExpirationDate("");
    setNoExpiry(false);
    setLotNumber("");
    setNotes("");
    setLocation("backstock");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await receiveStockAction(
        { itemId, quantity, location, noExpiry, expirationDate, lotNumber, unitCost, notes },
        tracksExpiration,
      );
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PackagePlus /> Receive stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Receive stock</DialogTitle>
            <DialogDescription>New purchase or donation. Enter one batch (one expiration date) at a time.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rq">Quantity ({unit})</Label>
              <Input id="rq" type="number" inputMode="numeric" min={1} required value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rc">Unit cost ($)</Label>
              <Input id="rc" type="number" inputMode="decimal" min={0} step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="optional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Put it in</Label>
            <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
              {(["backstock", "equipment_room"] as const).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={cn("h-8 rounded-md text-sm font-medium", location === loc ? "bg-background shadow-sm" : "text-muted-foreground")}
                >
                  {loc === "backstock" ? "Backstock" : "Equipment Room"}
                </button>
              ))}
            </div>
            {location === "equipment_room" && (
              <p className="text-muted-foreground text-xs">
                Only allowed if no backstock batch expires sooner (FEFO).
              </p>
            )}
          </div>

          {tracksExpiration && (
            <div className="space-y-2">
              <Label htmlFor="re">Expiration date</Label>
              <Input id="re" type="date" value={expirationDate} disabled={noExpiry} onChange={(e) => setExpirationDate(e.target.value)} required={!noExpiry} />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={noExpiry} onCheckedChange={(v) => setNoExpiry(v === true)} />
                No expiration date on this unit (some brands don’t expire)
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rl">Lot # (optional)</Label>
              <Input id="rl" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rn">Notes (optional)</Label>
              <Input id="rn" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. vendor, PO" />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Receive"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
