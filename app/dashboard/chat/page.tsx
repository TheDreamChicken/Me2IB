import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ChatPreview, type ChatContact } from "./chat-preview";

export const metadata: Metadata = { title: "AI Chat" };

export default async function ChatPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select(
      "id,name,company,position,shared_interests,last_contacted,relationship,notes"
    )
    .order("name");

  if (error) {
    throw new Error("Couldn't load contacts for chat presets: " + error.message);
  }

  return <ChatPreview contacts={(data ?? []) as ChatContact[]} />;
}
