import Link from "next/link";

import { Button } from "@/components/ui/button";

// Placeholder landing page. The member form (/submit) and admin area (/admin)
// are built in Phase 2/3 — see docs/ROADMAP.md.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">MERT Equipment</h1>
        <p className="text-muted-foreground text-sm">
          Took items from the Equipment Room after a call or bag check? Log them here.
        </p>
      </div>
      <Button asChild size="lg" className="h-14 text-base">
        <Link href="/submit">Log items used</Link>
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin">Admin sign in</Link>
      </Button>
    </main>
  );
}
