import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { LinkedInIcon } from "@/components/icons";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already gates /dashboard; this is defense in depth.
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        name={profile?.full_name ?? (user.user_metadata?.full_name as string) ?? null}
        email={user.email ?? null}
      />
      <main className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto w-full max-w-6xl flex-1">{children}</div>
        <footer className="mx-auto mt-10 w-full max-w-6xl border-t border-brand-100 pt-4 text-center text-xs text-zinc-400">
          created by Reyan{" "}
          <a
            href="https://www.linkedin.com/in/reyandatta/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Reyan's LinkedIn"
            className="inline-flex translate-y-0.5 text-brand-500 hover:text-brand-700"
          >
            <LinkedInIcon className="h-3.5 w-3.5" />
          </a>
          , who was just as confused about recruiting as you are
        </footer>
      </main>
    </div>
  );
}
