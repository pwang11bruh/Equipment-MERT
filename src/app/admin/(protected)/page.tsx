import Link from "next/link";
import { formatDistanceToNow, subDays } from "date-fns";
import { CheckCircle2, Circle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { AlertSeverity, ItemStock } from "@/types/domain";

export const metadata = { title: "Dashboard · MERT Equipment" };

const SEVERITY_VARIANT = { critical: "destructive", warning: "secondary", info: "outline" } as const;
const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

export default async function AdminDashboard() {
  const supabase = await createClient();
  const weekAgo = subDays(new Date(), 7).toISOString();
  const [{ data: stockData }, { data: alerts }, { data: submissions }, { count: weekCount }, { count: recipientCount }] = await Promise.all([
    supabase.from("v_item_stock").select("*").eq("is_archived", false),
    supabase.from("alerts").select("id, severity, title, message, item_id").eq("status", "open"),
    supabase
      .from("submissions")
      .select("id, submitted_by_name, reason, status, created_at, submission_lines(quantity, items(name))")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("submissions").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("alert_recipients").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const stock = (stockData ?? []) as unknown as ItemStock[];
  const belowPar = stock.filter((s) => s.room_par_qty > 0 && s.room_qty < s.room_par_qty).length;
  const reorder = stock.filter((s) => s.min_backstock_qty > 0 && s.backstock_qty < s.min_backstock_qty).length;
  const expiry = stock.filter((s) => s.expired_qty > 0 || s.expiring_soon_qty > 0).length;
  const withPar = stock.filter((s) => s.room_par_qty > 0).length;
  const withStock = stock.filter((s) => s.room_qty + s.backstock_qty > 0).length;
  const openAlerts = [...(alerts ?? [])].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  const critical = openAlerts.filter((a) => a.severity === "critical").length;

  const setup = [
    { done: withStock > 0, label: `Enter current stock (${withStock} of ${stock.length} items have stock)`, href: "/admin/inventory" },
    { done: withPar >= stock.length * 0.5, label: `Set Equipment Room pars (${withPar} of ${stock.length} items)`, href: "/admin/inventory" },
    { done: (recipientCount ?? 0) > 0, label: "Add who gets alerts (Equipment Officer, board)", href: "/admin/settings" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Room below par" value={belowPar} href="/admin/inventory" bad={belowPar > 0} />
        <Kpi label="Need reorder" value={reorder} href="/admin/inventory" bad={reorder > 0} />
        <Kpi label="Expiring / expired items" value={expiry} href="/admin/inventory" bad={expiry > 0} />
        <Kpi label="Submissions this week" value={weekCount ?? 0} href="/admin/submissions" />
      </div>

      {setup.some((s) => !s.done) && (
        <Card>
          <CardHeader>
            <CardTitle>Getting started</CardTitle>
            <CardDescription>Low-stock alerts only work once stock and pars are entered.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {setup.map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  {s.done ? <CheckCircle2 className="size-4 text-green-600" /> : <Circle className="text-muted-foreground size-4" />}
                  <Link href={s.href} className={cn("hover:underline", s.done && "text-muted-foreground line-through")}>
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Needs attention</CardTitle>
              <CardDescription>
                {openAlerts.length} open alert{openAlerts.length === 1 ? "" : "s"}
                {critical > 0 && `, ${critical} critical`}
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/alerts">All alerts</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {openAlerts.length === 0 ? (
              <p className="text-muted-foreground text-sm">All clear.</p>
            ) : (
              <ul className="divide-y">
                {openAlerts.slice(0, 8).map((a) => (
                  <li key={a.id} className="space-y-1 py-2.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[a.severity]}>{a.severity}</Badge>
                      {a.item_id ? (
                        <Link href={`/admin/inventory/${a.item_id}`} className="text-sm font-medium hover:underline">
                          {a.title}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium">{a.title}</span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">{a.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent submissions</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/submissions">All submissions</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!submissions?.length ? (
              <p className="text-muted-foreground text-sm">No submissions yet.</p>
            ) : (
              <ul className="divide-y">
                {submissions.map((s) => (
                  <li key={s.id} className="space-y-0.5 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.submitted_by_name}</span>
                      <Badge variant="outline">{s.reason}</Badge>
                      {s.status === "flagged" && <Badge variant="destructive">recount</Badge>}
                      <span className="text-muted-foreground ml-auto text-xs">
                        {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-muted-foreground truncate">
                      {s.submission_lines.map((l) => `${l.items?.name} × ${l.quantity}`).join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, href, bad }: { label: string; value: number; href: string; bad?: boolean }) {
  return (
    <Link href={href} className="hover:bg-muted/50 rounded-lg border p-3 transition-colors">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn("text-3xl font-semibold tabular-nums", bad && "text-destructive")}>{value}</p>
    </Link>
  );
}
