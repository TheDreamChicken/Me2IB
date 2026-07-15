"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function ApplicationsError({
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
    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6">
      <h2 className="text-lg font-semibold text-brand-900">
        Something went wrong
      </h2>
      <p className="mt-1 text-sm text-rose-600">{error.message}</p>
      <Button className="mt-4" onClick={() => unstable_retry()}>
        Try again
      </Button>
    </div>
  );
}
