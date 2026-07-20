import Link from "next/link";
import { LinkedInIcon } from "@/components/icons";

export function SiteFooter() {
  return (
    <footer className="border-t border-brand-100 bg-white/60 py-8 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 text-center text-sm text-zinc-500">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/" className="font-semibold text-brand-700 hover:text-brand-800">
            me2IB
          </Link>
          <Link href="/faq" className="hover:text-brand-700">
            Recruitment FAQ
          </Link>
          <Link href="/login" className="hover:text-brand-700">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-brand-700">
            Sign up
          </Link>
        </div>
        <p>
          Created by{" "}
          <a
            href="https://www.linkedin.com/in/reyandatta/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
          >
            Reyan Datta
            <LinkedInIcon className="h-3.5 w-3.5" />
          </a>
          . Northwestern University. Just as confused about recruitment as you
          were.
        </p>
        <p className="text-xs text-zinc-400">
          <a
            href="https://unavatar.io"
            className="underline decoration-zinc-300 underline-offset-2 hover:text-brand-700"
          >
            Avatars provided by Unavatar
          </a>
        </p>
      </div>
    </footer>
  );
}
