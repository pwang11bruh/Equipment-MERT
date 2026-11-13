import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isAdminRequest } from "@/lib/supabase/server";

import { signOutAction } from "../actions";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware guarantees a session; this guarantees it's THE admin account.
  if (!(await isAdminRequest())) redirect("/admin/login?error=forbidden");

  return (
    <div className="min-h-dvh">
      <header className="bg-background/95 sticky top-[env(safe-area-inset-top,0px)] z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/admin" className="font-semibold">
            MERT Equipment
          </Link>
          <nav className="flex flex-1 gap-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:bg-muted rounded-md px-2.5 py-1.5">
                {n.label}
              </Link>
            ))}
          </nav>
          <form action={signOutAction}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut /> Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
