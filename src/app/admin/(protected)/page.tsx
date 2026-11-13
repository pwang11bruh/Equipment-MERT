import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

// Phase 2 placeholder dashboard: open alerts + recent submissions.
// The full dashboard (KPIs, inventory, FEFO swap list) is Phase 3.

const SEVERITY_VARIANT = { critical: "destructive", warning: "secondary", info: "outline" } as const;

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [{ data: alerts }, { data: submissions }, { count: itemCount }] = await Promise.all([
    supabase
      .from("alerts")
      .select("id, severity, title, message, first_detected_at")
      .eq("status", "open")
      .order("severity", { ascending: false })
      .order("first_detected_at", { ascending: false })
      .limit(50),
    supabase
      .from("submissions")
      .select("id, submitted_by_name, reason, context, status, created_at, submission_lines(quantity, items(name))")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("items").select("id", { count: "exact", head: true }).eq("is_archived", false),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          {itemCount ?? 0} active catalog items · Inventory, stock entry and reports arrive in the next phase.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open alerts ({alerts?.length ?? 0})</CardTitle>
          <CardDescription>Low stock, expirations, recounts and FEFO swaps.</CardDescription>
        </CardHeader>
        <CardContent>
          {!alerts?.length ? (
            <p className="text-muted-foreground text-sm">No open alerts.</p>
          ) : (
            <ul className="divide-y">
              {alerts.map((a) => (
                <li key={a.id} className="space-y-1 py-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={SEVERITY_VARIANT[a.severity]}>{a.severity}</Badge>
                    <span className="font-medium">{a.title}</span>
                  </div>
                  <p className="text-muted-foreground text-sm">{a.message}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {!submissions?.length ? (
            <p className="text-muted-foreground text-sm">
              No submissions yet. Members log items at <Link className="underline" href="/submit">/submit</Link>.
            </p>
          ) : (
            <ul className="divide-y">
              {submissions.map((s) => (
                <li key={s.id} className="space-y-1 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{s.submitted_by_name}</span>
                    <Badge variant="outline">{s.reason}</Badge>
                    <Badge variant="outline">{s.context.replace("_", " ")}</Badge>
                    {s.status === "flagged" && <Badge variant="destructive">flagged</Badge>}
                    <span className="text-muted-foreground ml-auto text-xs">
                      {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {s.submission_lines.map((l) => `${l.items?.name} × ${l.quantity}`).join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
