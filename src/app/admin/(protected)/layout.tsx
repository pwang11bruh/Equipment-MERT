import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient, isAdminRequest } from "@/lib/supabase/server";

import { signOutAction } from "../actions";
import { NavLinks } from "./nav-links";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware guarantees a session; this guarantees it's THE admin account.
  if (!(await isAdminRequest())) redirect("/admin/login?error=forbidden");

  const supabase = await createClient();
  const { count } = await supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open");

  return (
    <div className="min-h-dvh">
      <header className="bg-background/95 sticky top-[env(safe-area-inset-top,0px)] z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <Link href="/admin" className="hidden shrink-0 font-semibold sm:block">
            MERT Equipment
          </Link>
          <NavLinks openAlerts={count ?? 0} />
          <form action={signOutAction}>
            <Button variant="ghost" size="sm" type="submit" aria-label="Sign out">
              <LogOut /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
