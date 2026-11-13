"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { deleteRecipientAction, saveRecipientAction, sendTestAction, type RecipientInput } from "./actions";

export interface Recipient {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone_e164: string | null;
  notify_email: boolean;
  notify_sms: boolean;
  is_active: boolean;
}

const ROLE_LABEL: Record<string, string> = { equipment_officer: "Equipment Officer", board: "Board", other: "Other" };
const EMPTY: RecipientInput = { name: "", role: "board", email: "", phone: "", notifyEmail: true, notifySms: false, isActive: true };

export function Recipients({ recipients }: { recipients: Recipient[] }) {
  const [editing, setEditing] = useState<{ id: string | null; form: RecipientInput } | null>(null);
  const [pending, start] = useTransition();

  function edit(r: Recipient) {
    setEditing({
      id: r.id,
      form: {
        name: r.name,
        role: r.role as RecipientInput["role"],
        email: r.email ?? "",
        phone: r.phone_e164 ?? "",
        notifyEmail: r.notify_email,
        notifySms: r.notify_sms,
        isActive: r.is_active,
      },
    });
  }

  const set = <K extends keyof RecipientInput>(k: K, v: RecipientInput[K]) =>
    setEditing((e) => (e ? { ...e, form: { ...e.form, [k]: v } } : e));

  return (
    <div className="space-y-3">
      {recipients.length === 0 ? (
        <p className="text-muted-foreground text-sm">No one is set up to receive alerts yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {recipients.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {r.name} {!r.is_active && <Badge variant="outline">paused</Badge>}
                </p>
                <p className="text-muted-foreground text-xs">
                  {ROLE_LABEL[r.role] ?? r.role}
                  {r.email && ` · ${r.email}`}
                  {r.phone_e164 && ` · ${r.phone_e164}`}
                </p>
              </div>
              <div className="flex gap-1">
                {r.notify_email && <Badge variant="secondary">email</Badge>}
                {r.notify_sms && <Badge variant="secondary">text</Badge>}
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Send test to ${r.name}`}
                title="Send a test message"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await sendTestAction(r.id);
                    if (!res.ok) toast.error(res.error);
                    else toast.success(res.message);
                  })
                }
              >
                <Send />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => edit(r)} aria-label={`Edit ${r.name}`}>
                <Pencil />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remove ${r.name}`}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await deleteRecipientAction(r.id);
                    if (!res.ok) toast.error(res.error);
                    else toast.success(res.message);
                  })
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="outline" onClick={() => setEditing({ id: null, form: EMPTY })}>
        <Plus /> Add person
      </Button>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          {editing && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const res = await saveRecipientAction(editing.id, editing.form);
                  if (!res.ok) return void toast.error(res.error);
                  toast.success(res.message);
                  setEditing(null);
                });
              }}
            >
              <DialogHeader>
                <DialogTitle>{editing.id ? "Edit recipient" : "Add recipient"}</DialogTitle>
                <DialogDescription>
                  The Equipment Officer gets every alert. Board members get low-stock and reorder alerts.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="rn">Name</Label>
                  <Input id="rn" value={editing.form.name} onChange={(e) => set("name", e.target.value)} required />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Role</Label>
                  <Select value={editing.form.role} onValueChange={(v) => set("role", v as RecipientInput["role"])}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipment_officer">Equipment Officer</SelectItem>
                      <SelectItem value="board">Board member</SelectItem>
                      <SelectItem value="other">Other (gets low-stock alerts)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="re">Email</Label>
                  <Input id="re" type="email" value={editing.form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp">Mobile</Label>
                  <Input id="rp" type="tel" value={editing.form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="555 123 4567" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={editing.form.notifyEmail} onCheckedChange={(v) => set("notifyEmail", v)} /> Email me
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={editing.form.notifySms} onCheckedChange={(v) => set("notifySms", v)} /> Text me (room at par, urgent alerts)
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={editing.form.isActive} onCheckedChange={(v) => set("isActive", v)} /> Active
                </label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
