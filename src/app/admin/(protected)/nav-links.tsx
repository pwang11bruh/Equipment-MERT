"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/alerts", label: "Alerts" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
];

export function NavLinks({ openAlerts }: { openAlerts: number }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto text-sm">
      {NAV.map((n) => {
        const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={cn("shrink-0 rounded-md px-2.5 py-1.5", active ? "bg-muted font-medium" : "hover:bg-muted/60")}
          >
            {n.label}
            {n.href === "/admin/alerts" && openAlerts > 0 && (
              <span className="bg-destructive text-destructive-foreground ml-1.5 rounded-full px-1.5 text-xs text-white">{openAlerts}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
