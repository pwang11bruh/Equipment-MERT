"use client";

import { useState, useTransition } from "react";
import { ArrowRightLeft, MoveRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { formatDate } from "@/lib/admin/format";

import { moveNextBatchAction, rebalanceAction } from "../actions";

/** One-tap answer to "Equipment Room X is low. Move next batch (Exp: D) from Backstock." */
export function MoveNextBatchDialog({
  itemId,
  unit,
  batchQty,
  batchExp,
  suggested,
}: {
  itemId: string;
  unit: string;
  batchQty: number;
  batchExp: string | null;
  suggested: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const defaultQty = suggested > 0 ? Math.min(suggested, batchQty) : batchQty;
  const [quantity, setQuantity] = useState(String(defaultQty));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(quantity, 10);
    if (!n || n < 1) return void toast.error("Enter how many you moved.");
    start(async () => {
      const res = await moveNextBatchAction(itemId, Math.min(n, batchQty));
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (setOpen(o), o && setQuantity(String(defaultQty)))}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={batchQty === 0} title={batchQty === 0 ? "No usable backstock" : undefined}>
          <MoveRight /> Move next batch
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Move next batch to the Equipment Room</DialogTitle>
            <DialogDescription>
              Next backstock batch: <b>{batchQty} {unit}</b>, {batchExp ? <>expiring <b>{formatDate(batchExp)}</b></> : "no expiration"}.
              Record this after you physically move the units.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="mq">How many did you move? (max {batchQty})</Label>
            <Input id="mq" type="number" inputMode="numeric" min={1} max={batchQty} value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
            {suggested > 0 && <p className="text-muted-foreground text-xs">Move at least {suggested} to get above par and clear the alert.</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Moving…" : "Record move"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "Mark swapped": align records after a physical FEFO swap (admin_fefo_rebalance). */
export function RebalanceButton({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ArrowRightLeft /> I swapped them. Update records
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm the swap</DialogTitle>
          <DialogDescription>
            Only do this after you’ve physically put the soonest-expiring units in the Equipment Room and moved the
            later ones to Backstock. The Equipment Room count stays the same; the records just switch which batches are
            where.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await rebalanceAction(itemId);
                if (!res.ok) return void toast.error(res.error);
                toast.success(res.message);
                setOpen(false);
              })
            }
          >
            {pending ? "Updating…" : "Yes, I swapped them"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
