<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Quick cheat-sheet (generated from the bundled docs): `docs/nextjs16-conventions.md`. Highlights for 16.2.10: `proxy.ts` replaces `middleware.ts`; `params`/`searchParams`/`cookies()` are async (Promises); `fetch` is NOT cached by default; error boundaries receive `unstable_retry` (not `reset`); Turbopack is the default bundler; Tailwind v4 (no `tailwind.config` — theme lives in `app/globals.css` under `@theme`).

# Project: me2IB

A recruiting hub for students breaking into finance/consulting/business. Auth'd users get a dashboard with: contacts (with follow-up staleness tracking), an application tracker (grouped industry → tier → sector), calendar with rule-based smart suggestions, documents storage (Supabase storage bucket `documents`), a recruiting plan/timeline tab, opportunities board, experience log, behavioral story bank, static practice + resources content, and account/profile. Public pages: landing (`/`), FAQ (`/faq`), login/signup.

## Stack

- **Next.js 16.2.10** App Router, TypeScript, Tailwind v4, `lucide-react` v1 (brand icons removed — use `components/icons.tsx` for LinkedIn), `react-markdown`.
- **Supabase**: auth (email/password via `@supabase/ssr`), Postgres with RLS (every table scoped to `auth.uid() = user_id`), private storage bucket. Schema lives in `supabase/schema.sql` — the single source of truth; run it in the Supabase SQL editor (idempotent). Credentials in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **AI (wired, except chat + AI math practice)**: `app/api/ai/route.ts` implements document review / plan / chat / outreach / opportunity-scan / contact-parse endpoints behind a provider layer: Anthropic via `@anthropic-ai/sdk` (adaptive thinking, `web_search_20260209` tool) or OpenAI via raw `fetch` to the Responses API (`web_search` tool, strict json_schema outputs — no `openai` package). The active model is an app-wide setting: `app_settings` row `ai_model` (catalog + provider inference in `lib/ai-models.ts`; provider comes from the model-ID prefix), editable only by admins via the Account → "AI engine" card (`profiles.is_admin`, grantable ONLY from the Supabase SQL editor — a DB trigger blocks API changes, and app_settings RLS restricts writes to admins). With no setting, provider falls back to whichever of `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` is set (Anthropic wins if both; `AI_PROVIDER` overrides) with defaults `claude-opus-4-8` / `gpt-5.6-sol`; with no key, a helpful 503 `setup` message is returned. UI calls it via `callAI()` from `lib/ai-client.ts`; the AI Chat page and Math Gym "AI Practice" tab intentionally remain "coming soon" placeholders.

## Architecture & conventions

Read `docs/feature-conventions.md` for the binding patterns. Summary:

- **Auth flow**: root `proxy.ts` → `lib/supabase/proxy.ts` `updateSession()` refreshes tokens on every request and gates `/dashboard`. `app/dashboard/layout.tsx` re-checks the user (defense in depth) and renders the sidebar. Login/signup are server actions in `lib/actions/auth.ts`; email-link confirmation handled by `app/auth/confirm/route.ts` (token_hash) and `app/auth/callback/route.ts` (PKCE code).
- **Feature pattern** (reference implementation: contacts): server `page.tsx` fetches rows via `lib/supabase/server.ts` `createClient()` → passes to a `"use client"` `*-view.tsx` (search/filter state, modals) → mutations via `"use server"` actions in `lib/actions/<domain>.ts` that auth-check first, `.eq("user_id", user.id)`, then `revalidatePath()`.
- **Shared vocabulary**: `lib/constants.ts` (industries, tiers, sectors, statuses + badge colors, event types…) and `lib/types.ts` (DB row types). Never redefine these.
- **UI kit**: `components/ui.tsx` (Button, Card, Modal, Field, Badge, StatCard, PageHeader, EmptyState, DeleteButton…). Theme: lavender `brand-50…900` scale in `app/globals.css`; cozy rounded-2xl cards with `card-shadow`; markdown rendered with class `prose-cozy`.
- **Tiers/monetization**: `free` ("Still cold") / `warming` ("Warming up", $4/mo) / `heat` ("In the heat", $10/mo) stored on `profiles.tier`. Matrix + helpers in `lib/tiers.ts`; client access via `useTier()` (`components/tier-context.tsx`, provided by the dashboard layout); gate UI with `components/tier-gate.tsx`; purchase/access-code UI in Account (demo checkout — no real payments yet; access codes live server-side in `lib/actions/profile.ts`). The AI route also enforces tiers server-side. Free = everything except Practice + AI (LinkedIn `parse_contact` import stays free); `warming` adds Practice + AI opportunity scanner; `heat` adds all AI.

## Gotchas (learned the hard way — do not regress these)

- **Never use `<form action={submitFn}>` for feature forms.** React 19 auto-resets the form after a function action completes: `<select>`s snap to their first option (while controlled state keeps the right value — invisible data desync), and uncontrolled inputs lose the user's edits on a failed save. Every feature form uses `onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }}` instead. Keep it that way.
- **Never run `npm run build` while the dev server is running.** Both write to `.next` and the dev server's routing corrupts (random 404s). Validate with `npx tsc --noEmit` while dev is up; if routes ever 404 mysteriously: stop the server, `rm -rf .next`, restart.
- Schema changes go into `supabase/schema.sql` as idempotent statements (the whole file is safe to re-run); the user applies it manually in the Supabase SQL editor.

## Commands

- `npm run dev` — dev server (Turbopack).
- `npm run build` — production build; run this to validate changes (`next lint` no longer exists; `npm run lint` runs ESLint directly). **Not while the dev server is running** — see Gotchas.
- `npx tsc --noEmit` — typecheck.

There is no test suite yet. Validate by building and clicking through the dashboard flows (see README for Supabase setup).
