"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AlertSeverity } from "@/types/domain";

import { saveAlertSettingsAction } from "./actions";

export function AlertSettingsForm({
  initial,
}: {
  initial: { expirationWarningDays: number; smsMinSeverity: AlertSeverity; emailEnabled: boolean; smsEnabled: boolean };
}) {
  const [days, setDays] = useState(String(initial.expirationWarningDays));
  const [smsMin, setSmsMin] = useState<AlertSeverity>(initial.smsMinSeverity);
  const [emailEnabled, setEmailEnabled] = useState(initial.emailEnabled);
  const [smsEnabled, setSmsEnabled] = useState(initial.smsEnabled);
  const [pending, start] = useTransition();

  return (
    <form
      className="grid max-w-xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveAlertSettingsAction({ expirationWarningDays: days, smsMinSeverity: smsMin, emailEnabled, smsEnabled });
          if (!res.ok) toast.error(res.error);
          else toast.success(res.message);
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="days">Warn about expirations this many days ahead</Label>
        <Input id="days" type="number" min={1} max={365} className="w-32" value={days} onChange={(e) => setDays(e.target.value)} />
        <p className="text-muted-foreground text-xs">60 days ≈ 2 months.</p>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="email" checked={emailEnabled} onCheckedChange={setEmailEnabled} />
        <Label htmlFor="email">Send email alerts</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="sms" checked={smsEnabled} onCheckedChange={setSmsEnabled} />
        <Label htmlFor="sms">Send text (SMS) alerts</Label>
      </div>
      <div className="space-y-1.5">
        <Label>Text only for alerts that are at least</Label>
        <Select value={smsMin} onValueChange={(v) => setSmsMin(v as AlertSeverity)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="critical">Critical (e.g. room empty)</SelectItem>
            <SelectItem value="warning">Warning (e.g. below par)</SelectItem>
            <SelectItem value="info">Everything</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-muted-foreground text-xs">
        Email and text sending is switched on in a later step (needs Resend and Twilio accounts). Until then, alerts
        appear on the dashboard and Alerts page only.
      </p>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save alert settings"}
        </Button>
      </div>
    </form>
  );
}
