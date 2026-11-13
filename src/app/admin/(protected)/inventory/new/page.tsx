import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { byName } from "@/lib/admin/format";
import { createClient } from "@/lib/supabase/server";

import { ItemForm } from "../item-form";

export const metadata = { title: "New item · MERT Equipment" };

export default async function NewItemPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("item_categories").select("id, name");
  return (
    <div className="space-y-4">
      <Link href="/admin/inventory" className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline">
        <ArrowLeft className="size-4" /> Inventory
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>New item</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemForm categories={(categories ?? []).sort(byName)} />
        </CardContent>
      </Card>
    </div>
  );
}
