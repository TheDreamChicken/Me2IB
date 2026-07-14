"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { signup } from "@/lib/actions/auth";
import { Button, Field, Input, Spinner } from "@/components/ui";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, undefined);

  if (state?.message) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="rounded-2xl bg-brand-100 p-3 text-brand-600">
          <MailCheck className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold text-brand-900">
          Almost there!
        </h1>
        <p className="text-sm leading-relaxed text-zinc-500">{state.message}</p>
        <Link
          href="/login"
          className="mt-2 text-sm font-medium text-brand-700 hover:underline"
        >
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Free to start. Your future self says thanks.
        </p>
      </div>

      <Field label="Full name">
        <Input name="full_name" placeholder="Jordan Lee" autoComplete="name" required />
      </Field>
      <Field label="Email">
        <Input
          name="email"
          type="email"
          placeholder="you@school.edu"
          autoComplete="email"
          required
        />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <Input
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      {state?.error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Spinner /> : "Sign up"}
      </Button>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-700 hover:underline"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
