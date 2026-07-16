import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { FaqView } from "@/app/faq/faq-view";

export const metadata: Metadata = { title: "Recruiting FAQ" };

// Same FAQ content as the public /faq page, rendered inside the dashboard
// shell so signed-in users never get bounced to the logged-out pages.
export default function DashboardFaqPage() {
  return (
    <div>
      <PageHeader
        title="Recruiting, demystified"
        description="Timelines, tiers, coffee chats, and the acronym soup — explained like an older student would over lunch. No question is too basic."
      />
      <FaqView />
    </div>
  );
}
