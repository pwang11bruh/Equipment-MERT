"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { verifyPinAction, type PinState } from "./actions";

export function PinForm() {
  const [state, formAction, pending] = useActionState<PinState, FormData>(verifyPinAction, {});

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <div className="bg-muted mx-auto flex size-12 items-center justify-center rounded-full">
          <LockKeyhole className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">MERT Equipment</h1>
        <p className="text-muted-foreground text-sm">Enter the team PIN to log items you took.</p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pin">Team PIN</Label>
          <Input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            autoFocus
            required
            maxLength={12}
            className="h-12 text-center text-2xl tracking-[0.4em]"
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "pin-error" : undefined}
          />
          {state.error && (
            <p id="pin-error" role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}
        </div>
        <Button type="submit" className="h-12 w-full text-base" disabled={pending}>
          {pending ? "Checking…" : "Unlock"}
        </Button>
      </form>
    </main>
  );
}
