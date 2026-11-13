import { differenceInCalendarDays, format, parseISO } from "date-fns";

import type { ExpiryState } from "@/types/domain";

/** "2027-06-22" -> "Jun 22, 2027". Dates are DATE columns (no timezone). */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return format(parseISO(date), "MMM d, yyyy");
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  return differenceInCalendarDays(parseISO(date), new Date());
}

export function expiryLabel(state: ExpiryState | string | null, days: number | null): string {
  switch (state) {
    case "expired":
      return days === null ? "Expired" : `Expired ${Math.abs(days)}d ago`;
    case "expiring_soon":
      return days === 0 ? "Expires today" : `Expires in ${days}d`;
    case "no_expiry":
      return "No expiry";
    default:
      return days === null ? "" : `${days}d left`;
  }
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

/** A–Z, case-insensitive (owner request: everything alphabetical). */
export function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export const LOCATION_LABEL = { equipment_room: "Equipment Room", backstock: "Backstock" } as const;
