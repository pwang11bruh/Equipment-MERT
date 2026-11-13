"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { setMemberPinAction, type SetPinState } from "./actions";

export function MemberPinForm() {
  const [state, formAction, pending] = useActionState<SetPinState, FormData>(setMemberPinAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Member PIN updated");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pin">New PIN</Label>
        <Input id="pin" name="pin" type="password" inputMode="numeric" autoComplete="new-password" required maxLength={12} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm new PIN</Label>
        <Input id="confirm" name="confirm" type="password" inputMode="numeric" autoComplete="new-password" required maxLength={12} />
      </div>
      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Set PIN"}
      </Button>
    </form>
  );
}
