import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/lib/types";
import { DocumentsView } from "./documents-view";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error("Couldn't load documents: " + error.message);

  return <DocumentsView documents={(data ?? []) as Document[]} />;
}
