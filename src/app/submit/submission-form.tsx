"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Lock, Minus, Plus, Search, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { matchesSearch } from "@/lib/search";
import { cn } from "@/lib/utils";
import { submissionSchema } from "@/lib/validation/submission";
import type { ReplacementCause, SubmissionContext, SubmissionReason, SubmissionResult } from "@/types/domain";

import { lockAction, submitUsageAction } from "./actions";

export interface PickerItem {
  id: string;
  name: string;
  unit: string;
  description: string | null;
}

type Line = { quantity: number; cause: ReplacementCause | null };

const NAME_KEY = "mert_member_name";

const REASONS: { value: SubmissionReason; title: string; hint: string }[] = [
  { value: "restock", title: "Restock", hint: "Items were used (call, event…)" },
  { value: "replacement", title: "Replacement", hint: "Items were expired, broken or missing" },
];

const CONTEXTS: { value: SubmissionContext; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "bag_check", label: "Bag check" },
  { value: "other", label: "Other" },
];

const CAUSES: { value: ReplacementCause; label: string }[] = [
  { value: "expired", label: "Expired" },
  { value: "broken", label: "Broken" },
  { value: "damaged", label: "Damaged" },
  { value: "missing", label: "Missing" },
  { value: "other", label: "Other" },
];

export function SubmissionForm({ items }: { items: PickerItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [reason, setReason] = useState<SubmissionReason | null>(null);
  const [context, setContext] = useState<SubmissionContext>("call");
  const [callReference, setCallReference] = useState("");
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Map<string, Line>>(new Map());
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  // Remember the member's name on this device (convenience only).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY);
      if (saved) setName(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const filtered = useMemo(() => items.filter((i) => matchesSearch(i.name, query)), [items, query]);
  const selected = [...lines.entries()]
    .map(([id, line]) => ({ item: byId.get(id)!, ...line }))
    .filter((l) => l.item)
    .sort((a, b) => a.item.name.localeCompare(b.item.name, undefined, { sensitivity: "base" }));
  const totalUnits = selected.reduce((sum, l) => sum + l.quantity, 0);

  function toggleItem(id: string) {
    setLines((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, { quantity: 1, cause: null });
      return next;
    });
  }

  function updateLine(id: string, patch: Partial<Line>) {
    setLines((prev) => {
      const next = new Map(prev);
      const current = next.get(id);
      if (!current) return prev;
      const updated = { ...current, ...patch };
      if (updated.quantity <= 0) next.delete(id);
      else next.set(id, { ...updated, quantity: Math.min(updated.quantity, 500) });
      return next;
    });
  }

  const payload = {
    name,
    reason: reason ?? undefined,
    context,
    callReference: context === "call" ? callReference : undefined,
    notes,
    lines: selected.map((l) => ({
      item_id: l.item.id,
      quantity: l.quantity,
      replacement_cause: reason === "replacement" ? l.cause : null,
    })),
  };
  const validation = submissionSchema.safeParse(payload);
  const errors = showErrors && !validation.success ? validation.error.issues : [];
  const errorFor = (path: string) => errors.find((e) => e.path.join(".") === path)?.message;
  const missingCause = (index: number) => !!errorFor(`lines.${index}.replacement_cause`);

  function handleSubmit() {
    setShowErrors(true);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    startTransition(async () => {
      const res = await submitUsageAction(validation.data);
      if (!res.ok) {
        toast.error(res.error);
        if (res.locked) router.refresh();
        return;
      }
      try {
        localStorage.setItem(NAME_KEY, validation.data.name);
      } catch {
        /* ignore */
      }
      setResult(res.result);
      window.scrollTo({ top: 0 });
    });
  }

  function startOver() {
    setResult(null);
    setLines(new Map());
    setQuery("");
    setNotes("");
    setCallReference("");
    setReason(null);
    setShowErrors(false);
  }

  async function lock() {
    await lockAction();
    router.refresh();
  }

  if (result) {
    return <SuccessView name={name} result={result} onAgain={startOver} onLock={lock} />;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-32">
      {/* Header */}
      <header className="bg-background/95 sticky top-[env(safe-area-inset-top,0px)] z-20 flex items-center justify-between border-b px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold leading-tight">Log items taken</h1>
          <p className="text-muted-foreground text-xs">From the Equipment Room</p>
        </div>
        <Button variant="ghost" size="sm" onClick={lock} aria-label="Lock">
          <Lock /> Lock
        </Button>
      </header>

      <div className="space-y-6 px-4 pt-4">
        {/* Name */}
        <section className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="First and last name"
            className="h-11 text-base"
            aria-invalid={errorFor("name") ? true : undefined}
          />
          {errorFor("name") && <p className="text-destructive text-sm">{errorFor("name")}</p>}
        </section>

        {/* Reason */}
        <section className="space-y-2">
          <Label>Why are you taking items?</Label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={reason === r.value}
                onClick={() => setReason(r.value)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  reason === r.value ? "border-primary bg-primary/5 ring-primary ring-1" : "hover:bg-muted",
                  errorFor("reason") && !reason && "border-destructive",
                )}
              >
                <span className="block font-medium">{r.title}</span>
                <span className="text-muted-foreground block text-xs">{r.hint}</span>
              </button>
            ))}
          </div>
          {errorFor("reason") && <p className="text-destructive text-sm">Choose restock or replacement</p>}
        </section>

        {/* Context */}
        <section className="space-y-2">
          <Label>After a…</Label>
          <div className="bg-muted grid grid-cols-3 gap-1 rounded-lg p-1" role="radiogroup">
            {CONTEXTS.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={context === c.value}
                onClick={() => setContext(c.value)}
                className={cn(
                  "h-9 rounded-md text-sm font-medium transition-colors",
                  context === c.value ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          {context === "call" && (
            <Input
              value={callReference}
              onChange={(e) => setCallReference(e.target.value)}
              placeholder="Call / run # (optional)"
              className="h-11 text-base"
            />
          )}
        </section>

        {/* Selected items */}
        {selected.length > 0 && (
          <section className="space-y-2">
            <Label>
              Your items ({selected.length})
            </Label>
            <ul className="divide-y rounded-lg border">
              {selected.map((l, index) => (
                <li key={l.item.id} className="space-y-2 p-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{l.item.name}</p>
                      <p className="text-muted-foreground text-xs">{l.item.unit}</p>
                    </div>
                    <Stepper
                      value={l.quantity}
                      onChange={(q) => updateLine(l.item.id, { quantity: q })}
                      label={l.item.name}
                    />
                  </div>
                  {reason === "replacement" && (
                    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Reason for ${l.item.name}`}>
                      {CAUSES.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          role="radio"
                          aria-checked={l.cause === c.value}
                          onClick={() => updateLine(l.item.id, { cause: c.value })}
                          className={cn(
                            "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
                            l.cause === c.value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "hover:bg-muted",
                            missingCause(index) && !l.cause && "border-destructive",
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* A–Z picker */}
        <section className="space-y-2">
          <Label htmlFor="search">Add items</Label>
          <div className="bg-background sticky top-[calc(env(safe-area-inset-top,0px)+3.75rem)] z-10 pb-2">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${items.length} items…`}
                className="h-11 pr-10 pl-9 text-base"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-muted-foreground absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
          {errorFor("lines") && <p className="text-destructive text-sm">{errorFor("lines")}</p>}
          {filtered.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No items match “{query}”.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {filtered.map((item) => {
                const isSelected = lines.has(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                        isSelected ? "bg-primary/5" : "hover:bg-muted",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block">{item.name}</span>
                        {item.description && (
                          <span className="text-muted-foreground block text-xs">{item.description}</span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border",
                          isSelected && "border-primary bg-primary text-primary-foreground",
                        )}
                      >
                        {isSelected ? <Check className="size-4" /> : <Plus className="size-4" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Notes */}
        <section className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the Equipment Officer should know"
            className="text-base"
            rows={3}
          />
        </section>
      </div>

      {/* Submit bar */}
      <div className="bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] backdrop-blur">
        <div className="mx-auto max-w-lg">
          <Button className="h-12 w-full text-base" onClick={handleSubmit} disabled={pending}>
            {pending
              ? "Submitting…"
              : selected.length === 0
                ? "Select items to submit"
                : `Submit ${selected.length} item${selected.length === 1 ? "" : "s"} (${totalUnits} total)`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-10"
        onClick={() => onChange(value - 1)}
        aria-label={value === 1 ? `Remove ${label}` : `Decrease ${label}`}
      >
        {value === 1 ? <X /> : <Minus />}
      </Button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={500}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(Math.max(1, n));
        }}
        className="h-10 w-12 rounded-md border text-center text-base tabular-nums"
        aria-label={`Quantity of ${label}`}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-10"
        onClick={() => onChange(value + 1)}
        aria-label={`Increase ${label}`}
      >
        <Plus />
      </Button>
    </div>
  );
}

function SuccessView({
  name,
  result,
  onAgain,
  onLock,
}: {
  name: string;
  result: SubmissionResult;
  onAgain: () => void;
  onLock: () => void;
}) {
  const flagged = result.lines.filter((l) => l.discrepancy_qty > 0);
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <CheckCircle2 className="mx-auto size-12 text-green-600" />
        <h1 className="text-2xl font-semibold">Logged. Thanks{name ? `, ${name.split(" ")[0]}` : ""}!</h1>
        <p className="text-muted-foreground text-sm">The inventory has been updated.</p>
      </div>

      <ul className="divide-y rounded-lg border">
        {result.lines.map((l) => (
          <li key={l.item_id} className="flex justify-between gap-3 p-3 text-sm">
            <span>{l.item_name}</span>
            <span className="tabular-nums">× {l.quantity}</span>
          </li>
        ))}
      </ul>

      {flagged.length > 0 && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>
            Our records didn’t match what you took for {flagged.map((f) => f.item_name).join(", ")}. The
            Equipment Officer has been notified to recount. Nothing else you need to do.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2">
        <Button className="h-12 text-base" onClick={onAgain}>
          Log more items
        </Button>
        <Button variant="ghost" onClick={onLock}>
          <Lock /> Done — lock this device
        </Button>
      </div>
    </main>
  );
}
