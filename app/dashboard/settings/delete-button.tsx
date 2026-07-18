"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

export const DELETE_CONFIRMATION_KEY = "me2ib-confirm-delete";

export function PreferenceDeleteButton({
  onConfirm,
  label = "Delete",
  className,
}: {
  onConfirm: () => void;
  label?: string;
  className?: string;
}) {
  const [confirmAgain, setConfirmAgain] = useState(true);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        setConfirmAgain(
          localStorage.getItem(DELETE_CONFIRMATION_KEY) !== "false"
        );
      } catch {
        setConfirmAgain(true);
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!armed) return;
    const timeout = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timeout);
  }, [armed]);

  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      className={className}
      onClick={() => {
        if (!confirmAgain || armed) onConfirm();
        else setArmed(true);
      }}
    >
      {confirmAgain && armed ? "Click again to confirm" : label}
    </Button>
  );
}
