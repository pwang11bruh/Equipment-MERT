import Link from "next/link";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "Submissions · MERT Equipment" };

const PAGE_SIZE = 50;
const CAUSE_LABEL: Record<string, string> = { expired: "expired", broken: "broken", damaged: "damaged", missing: "missing", other: "other" };

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<{ filter?: string; page?: string }> }) {
  const { filter, page: rawPage } = await searchParams;
  const flaggedOnly = filter === "flagged";
  const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("submissions")
    .select(
      "id, submitted_by_name, reason, context, call_reference, notes, status, created_at, submission_lines(id, quantity, replacement_cause, discrepancy_qty, item_id, items(name, unit))",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (flaggedOnly) query = query.eq("status", "flagged");
  const { data, count } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const href = (p: number, f = flaggedOnly) => `/admin/submissions?${new URLSearchParams({ ...(f ? { filter: "flagged" } : {}), page: String(p) })}`;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Submissions</h1>
        <p className="text-muted-foreground text-sm">Everything members logged from the Equipment Room.</p>
      </div>

      <div className="flex gap-1.5">
        {[
          { label: "All", f: false },
          { label: "Flagged (recount)", f: true },
        ].map((t) => (
          <Link
            key={t.label}
            href={href(1, t.f)}
            className={cn(
              "h-8 rounded-full border px-3 text-xs leading-8 font-medium",
              flaggedOnly === t.f ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {!data?.length ? (
        <p className="text-muted-foreground py-10 text-center text-sm">No submissions.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {data.map((s) => (
            <li key={s.id} className="space-y-2 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{s.submitted_by_name}</span>
                <Badge variant="outline">{s.reason}</Badge>
                <Badge variant="outline">{s.context.replace("_", " ")}</Badge>
                {s.call_reference && <span className="text-muted-foreground text-xs">Call #{s.call_reference}</span>}
                {s.status === "flagged" && <Badge variant="destructive">recount needed</Badge>}
                <span className="text-muted-foreground ml-auto text-xs">{format(new Date(s.created_at), "EEE MMM d, h:mm a")}</span>
              </div>
              <ul className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
                {[...s.submission_lines]
                  .sort((a, b) => (a.items?.name ?? "").localeCompare(b.items?.name ?? ""))
                  .map((l) => (
                    <li key={l.id} className="flex gap-2">
                      <Link href={`/admin/inventory/${l.item_id}`} className="hover:underline">
                        {l.items?.name}
                      </Link>
                      <span className="tabular-nums">× {l.quantity}</span>
                      {l.replacement_cause && <span className="text-muted-foreground">({CAUSE_LABEL[l.replacement_cause]})</span>}
                      {l.discrepancy_qty > 0 && <span className="text-destructive text-xs">{l.discrepancy_qty} not in records</span>}
                    </li>
                  ))}
              </ul>
              {s.notes && <p className="text-muted-foreground italic">“{s.notes}”</p>}
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={href(page - 1)} className="hover:underline">← Newer</Link> : <span />}
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={href(page + 1)} className="hover:underline">Older →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
