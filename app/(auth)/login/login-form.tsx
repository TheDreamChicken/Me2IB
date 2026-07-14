"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { Button, Field, Input, Spinner } from "@/components/ui";

export function LoginForm({
  next,
  urlError,
}: {
  next?: string;
  urlError?: string;
}) {
  const [state, formAction, pending] = useActionState(login, undefined);
  const error = state?.error ?? urlError;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Welcome back</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Log in to pick up where you left off.
        </p>
      </div>

      {next && <input type="hidden" name="next" value={next} />}

      <Field label="Email">
        <Input
          name="email"
          type="email"
          placeholder="you@school.edu"
          autoComplete="email"
          required
        />
      </Field>
      <Field label="Password">
        <Input
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </Field>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Spinner /> : "Log in"}
      </Button>

      <p className="text-center text-sm text-zinc-500">
        New here?{" "}
        <Link
          href="/signup"
          className="font-medium text-brand-700 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
