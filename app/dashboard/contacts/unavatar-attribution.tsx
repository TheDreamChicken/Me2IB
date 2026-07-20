import { cn } from "@/components/ui";

export function UnavatarLink({ className }: { className?: string }) {
  return (
    <a
      href="https://unavatar.io"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "underline underline-offset-2 hover:text-brand-600",
        className
      )}
    >
      Unavatar
    </a>
  );
}

export function UnavatarAttribution({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] text-zinc-400", className)}>
      Photo fallback by <UnavatarLink />; saved to your me2IB photo storage after
      source and image-format checks.
    </p>
  );
}
