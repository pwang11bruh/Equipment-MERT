import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { MemberPinForm } from "./pin-form";

export default function SettingsPage() {
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
    </div>
  );
}
