"use client";

import { useEffect } from "react";
import { CloudOff } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-brand-100 p-2 text-brand-600">
          <CloudOff className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-brand-900">Something went wrong</p>
          <p className="mt-1 text-sm text-zinc-500">
            We couldn&apos;t load this page. It&apos;s usually temporary — give
            it another try.
          </p>
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error.message || "An unexpected error occurred."}
          </p>
          <Button className="mt-4" onClick={() => unstable_retry()}>
            Try again
          </Button>
        </div>
      </div>
    </Card>
  );
}
