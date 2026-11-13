"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EquipmentStatus, InventoryLocation } from "@/types/domain";

import { lotAction, type LotActionInput } from "../actions";

type Kind = "to_room" | "to_backstock" | "oos" | "functional" | "dispose" | "adjust";

const COPY: Record<Kind, { title: string; description: string; needsReason: boolean; qtyLabel: string; submit: string }> = {
  to_room: {
    title: "Move to Equipment Room",
    description: "FEFO rule: only allowed if no backstock batch expires sooner.",
    needsReason: false,
    qtyLabel: "How many to move",
    submit: "Move",
  },
  to_backstock: {
    title: "Move to Backstock",
    description: "Take units out of the Equipment Room and put them back in reserve.",
    needsReason: false,
    qtyLabel: "How many to move",
    submit: "Move",
  },
  oos: {
    title: "Mark out of service",
    description: "Broken or failed equipment. It stops counting as usable stock until marked functional again.",
    needsReason: false,
    qtyLabel: "How many are out of service",
    submit: "Mark out of service",
  },
  functional: {
    title: "Mark functional",
    description: "Repaired or checked OK. It counts as usable stock again, in its current location.",
    needsReason: false,
    qtyLabel: "How many are working again",
    submit: "Mark functional",
  },
  dispose: {
    title: "Dispose",
    description: "Thrown away (expired, damaged, contaminated…). Counts as waste in reports.",
    needsReason: true,
    qtyLabel: "How many to dispose",
    submit: "Dispose",
  },
  adjust: {
    title: "Correct the count",
    description: "Set this batch to what you actually counted on the shelf.",
    needsReason: true,
    qtyLabel: "Actual count",
    submit: "Save count",
  },
};

export function LotActions({
  itemId,
  isEquipment,
  lot,
}: {
  itemId: string;
  isEquipment: boolean;
  lot: { id: string; location: InventoryLocation; status: EquipmentStatus; quantity: number; expiryState: string };
}) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function openAction(k: Kind) {
    setKind(k);
    setQuantity(k === "adjust" ? String(lot.quantity) : String(lot.quantity));
    setReason(k === "dispose" && lot.expiryState === "expired" ? "Expired" : "");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!kind) return;
    const base = { lotId: lot.id, reason: reason || undefined };
    const input: LotActionInput =
      kind === "to_room" || kind === "to_backstock"
        ? { ...base, kind: "transfer", quantity, to: kind === "to_room" ? "equipment_room" : "backstock" }
        : kind === "oos" || kind === "functional"
          ? { ...base, kind: "status", quantity, status: kind === "oos" ? "out_of_service" : "functional" }
          : kind === "dispose"
            ? { kind: "dispose", lotId: lot.id, quantity, reason }
            : { kind: "adjust", lotId: lot.id, newQuantity: quantity, reason };
    start(async () => {
      const res = await lotAction(itemId, input);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      setKind(null);
    });
  }

  const copy = kind ? COPY[kind] : null;
  const usable = lot.status === "functional" && lot.expiryState !== "expired";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Batch actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {lot.location === "backstock" && usable && <DropdownMenuItem onSelect={() => openAction("to_room")}>Move to Equipment Room</DropdownMenuItem>}
          {lot.location === "equipment_room" && <DropdownMenuItem onSelect={() => openAction("to_backstock")}>Move to Backstock</DropdownMenuItem>}
          {isEquipment && lot.status === "functional" && <DropdownMenuItem onSelect={() => openAction("oos")}>Mark out of service</DropdownMenuItem>}
          {lot.status === "out_of_service" && <DropdownMenuItem onSelect={() => openAction("functional")}>Mark functional</DropdownMenuItem>}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => openAction("adjust")}>Correct the count</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => openAction("dispose")}>
            Dispose
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!kind} onOpenChange={(o) => !o && setKind(null)}>
        <DialogContent>
          {copy && (
            <form onSubmit={submit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{copy.title}</DialogTitle>
                <DialogDescription>
                  {copy.description} This batch has {lot.quantity}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="lq">{copy.qtyLabel}</Label>
                <Input
                  id="lq"
                  type="number"
                  inputMode="numeric"
                  min={kind === "adjust" ? 0 : 1}
                  max={kind === "adjust" ? undefined : lot.quantity}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lr">Reason {copy.needsReason ? "" : "(optional)"}</Label>
                <Input id="lr" value={reason} onChange={(e) => setReason(e.target.value)} required={copy.needsReason} />
              </div>
              <DialogFooter>
                <Button type="submit" variant={kind === "dispose" ? "destructive" : "default"} disabled={pending}>
                  {pending ? "Saving…" : copy.submit}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
