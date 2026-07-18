# me2IB feature conventions (for implementation agents)

Read this fully, then read the reference implementation before writing code.

## Non-negotiables

1. **Next.js 16.2.10 has breaking changes.** Read `docs/nextjs16-conventions.md` (in this repo) BEFORE writing code. Highlights: `params`/`searchParams` are Promises and must be awaited; `cookies()` is async; `proxy.ts` replaces middleware (already set up — don't touch); error boundaries receive `unstable_retry` not `reset`; Tailwind v4 (no tailwind.config).
2. **Do NOT edit shared files**: `components/ui.tsx`, `components/icons.tsx`, `components/site-footer.tsx`, `components/dashboard/sidebar.tsx`, `components/tier-context.tsx`, `components/tier-gate.tsx`, `app/layout.tsx`, `app/globals.css`, `app/dashboard/layout.tsx`, `lib/supabase/*`, `lib/types.ts`, `lib/constants.ts`, `lib/tiers.ts`, `proxy.ts`, `supabase/schema.sql`, `app/api/ai/route.ts`. If you need a change in one, say so in your final message instead of editing.
3. **Do NOT run** `npm run dev`, `npm run build`, or install packages. `npx tsc --noEmit` is allowed and encouraged before finishing.
4. Only create/edit files inside your assigned route directory and your assigned `lib/actions/<domain>.ts` file.

## Stack & layout

- Next.js 16 App Router, TypeScript, Tailwind v4, Supabase (`@supabase/ssr`), lucide-react v1 (NO brand icons — `Linkedin` etc. don't exist; use `LinkedInIcon` from `@/components/icons` if needed), react-markdown.
- Path alias `@/*` = repo root.
- DB row types: `lib/types.ts`. Vocabulary (industries, tiers, sectors, statuses, colors): `lib/constants.ts` — use these, never redefine.
- Schema: `supabase/schema.sql` (source of truth for columns). All tables have RLS scoped to `auth.uid() = user_id`.

## Reference implementation — copy these patterns exactly

Read all four files:
- `app/dashboard/contacts/page.tsx` — server component: `createClient()` from `@/lib/supabase/server`, fetch rows, pass to client view. Export `metadata`.
- `app/dashboard/contacts/contacts-view.tsx` — `"use client"` view: local state for search/filters/modals, `useTransition` around server-action calls.
- `lib/actions/contacts.ts` — `"use server"` actions: auth-check via `supabase.auth.getUser()` FIRST in every action, build payload from `FormData` (empty string → null), `.eq("user_id", user.id)` on updates/deletes (defense in depth on top of RLS), `revalidatePath(...)` after mutations, return `{ error?: string; ok?: boolean }`.
- `components/ui.tsx` — shared primitives. Exports: `cn`, `Button` (variant: primary|secondary|ghost|danger, size: sm|md), `DeleteButton` (two-step confirm), `Input`, `Textarea`, `Select`, `Field` (label wrapper), `SearchInput`, `Card` (optional onClick), `Badge` (className overrides color), `StatCard`, `PageHeader` (title/description/action), `EmptyState`, `Spinner`, `Modal` ({open, onClose, title, children, wide}).

Forms: plain `<form action={submitFn}>` where `submitFn(formData)` wraps the server action in `startTransition`; `defaultValue` from the row being edited; hidden `id` input for edits. After `revalidatePath` the server component re-renders automatically — no manual refetch.

## Design language

Light purple/white, cozy, modern. Brand colors available as Tailwind classes `brand-50` … `brand-900` (lavender scale). Cards: `Card` component (rounded-2xl, soft shadow). Page structure: `PageHeader` → stats row (`StatCard`, optional) → filter bar → content grid/list → modals. Text: headings `text-brand-900`, muted `text-zinc-500`/`text-zinc-400`. Keep hover transitions subtle. Empty states always get an `EmptyState` with a friendly hint and a CTA. Mobile-first responsive (`sm:` / `lg:` grids).

## AI features: WIRED (except chat + AI math practice)

AI features are live. Call them with `callAI(task, payload)` from `@/lib/ai-client` inside `startTransition`/async handlers. Tasks: `review_document`, `plan`, `outreach`, `opportunities`, `parse_contact` (see `app/api/ai/route.ts` for payloads/results). Handle every branch of `AiResult`:
- `setup` → render the setup string in a friendly info card (API key missing — not an error state).
- `upgrade` → the surface should already be behind `<TierGate>`, but render the error text defensively.
- `error` → inline error text; keep prior results visible.
- Loading: `Spinner` + disabled button while the call runs.

Exceptions that STAY placeholders: the AI Chat page (`/dashboard/chat`) and the Math Gym "AI Practice" tab.

## Tier gating

Tiers: `free` ("Still Cold") / `warming` ("Warming Up", $4/mo) / `heat` ("In The Heat", $10/mo). Definitions + feature matrix in `lib/tiers.ts`; the user's tier comes from `useTier()` (`@/components/tier-context`, provided by the dashboard layout). Gate locked UI with `<TierGate feature=... title=... blurb=... perks?=... variant="page"|"card">` from `@/components/tier-gate` — page variant for whole sections (Practice), card variant for feature cards (AI review, scanner). The API route also enforces tiers server-side. Free tier includes everything except the Practice section and AI features (`parse_contact` LinkedIn import is intentionally free); `warming` adds Practice + the AI opportunity scanner; `heat` adds everything else.

## Supabase from the browser

Only needed for Storage uploads (documents feature): `createClient()` from `@/lib/supabase/client`. Bucket `documents` is private; upload to path `${user.id}/${filename}`; use `createSignedUrl` for downloads. Everything else goes through server components + server actions.

## Quality bar

- `npx tsc --noEmit` must pass for your files before you finish.
- No `any` unless unavoidable; import row types from `@/lib/types`.
- Every page exports `metadata` with a title.
- Loading states on async buttons (`Spinner`), pending states via `useTransition`.
- Dates: store as ISO strings; display with `toLocaleDateString("en-US", {...})`.
- Keep component files under ~600 lines; split into siblings in your route dir if bigger.
