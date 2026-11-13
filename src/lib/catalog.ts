import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

/** What a MEMBER may see about an item. Never add quantities here. */
export interface MemberCatalogItem {
  id: string;
  name: string;
  unit: string;
  description: string | null;
}

/**
 * Active catalog for the member form, A–Z (case-insensitive) per ADR-010.
 * Uses the service client because members have no Supabase session; it
 * selects only non-sensitive columns.
 */
export async function getMemberCatalog(): Promise<MemberCatalogItem[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("items")
    .select("id, name, unit, description")
    .eq("is_archived", false);
  if (error) throw new Error(`Failed to load catalog: ${error.message}`);
  return [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
