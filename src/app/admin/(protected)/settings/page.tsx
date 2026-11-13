import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { byName } from "@/lib/admin/format";
import { createClient } from "@/lib/supabase/server";

import { AlertSettingsForm } from "./alert-settings-form";
import { MemberPinForm } from "./pin-form";
import { Recipients } from "./recipients";

export const metadata = { title: "Settings · MERT Equipment" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: settings }, { data: recipients }] = await Promise.all([
    supabase.from("app_settings").select("*").eq("id", 1).single(),
    supabase.from("alert_recipients").select("id, name, role, email, phone_e164, notify_email, notify_sms, is_active"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Member PIN</CardTitle>
          <CardDescription>
            The shared 4–12 digit PIN members enter to log items. Changing it doesn’t sign out phones that are
            already unlocked; they relock automatically after 12 hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberPinForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Who gets alerts</CardTitle>
          <CardDescription>
            Equipment Officer: every alert. Board and others: low stock in the Equipment Room and reorder alerts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Recipients recipients={(recipients ?? []).sort(byName)} />
        </CardContent>
      </Card>

      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Alert settings</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertSettingsForm
              initial={{
                expirationWarningDays: settings.expiration_warning_days,
                smsMinSeverity: settings.sms_min_severity,
                emailEnabled: settings.email_enabled,
                smsEnabled: settings.sms_enabled,
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
