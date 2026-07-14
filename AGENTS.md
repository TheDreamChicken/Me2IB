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
- **AI (currently placeholder-only)**: `app/api/ai/route.ts` implements document review / plan / chat / outreach / opportunity-scan endpoints using `@anthropic-ai/sdk` (model `claude-opus-4-8`, adaptive thinking; opportunity scan uses the server-side `web_search_20260209` tool). It requires `ANTHROPIC_API_KEY` and returns a helpful 503 `setup` message without it. **The UI intentionally shows "coming soon" placeholder cards instead of calling it** — when asked to "turn on AI", wire placeholders to `callAI()` from `lib/ai-client.ts`.

## Architecture & conventions

Read `docs/feature-conventions.md` for the binding patterns. Summary:

- **Auth flow**: root `proxy.ts` → `lib/supabase/proxy.ts` `updateSession()` refreshes tokens on every request and gates `/dashboard`. `app/dashboard/layout.tsx` re-checks the user (defense in depth) and renders the sidebar. Login/signup are server actions in `lib/actions/auth.ts`; email-link confirmation handled by `app/auth/confirm/route.ts` (token_hash) and `app/auth/callback/route.ts` (PKCE code).
- **Feature pattern** (reference implementation: contacts): server `page.tsx` fetches rows via `lib/supabase/server.ts` `createClient()` → passes to a `"use client"` `*-view.tsx` (search/filter state, modals) → mutations via `"use server"` actions in `lib/actions/<domain>.ts` that auth-check first, `.eq("user_id", user.id)`, then `revalidatePath()`.
- **Shared vocabulary**: `lib/constants.ts` (industries, tiers, sectors, statuses + badge colors, event types…) and `lib/types.ts` (DB row types). Never redefine these.
- **UI kit**: `components/ui.tsx` (Button, Card, Modal, Field, Badge, StatCard, PageHeader, EmptyState, DeleteButton…). Theme: lavender `brand-50…900` scale in `app/globals.css`; cozy rounded-2xl cards with `card-shadow`; markdown rendered with class `prose-cozy`.
- **Future monetization note**: features will later be gated by tier/subscription — keep feature code modular; no gating exists today.

## Commands

- `npm run dev` — dev server (Turbopack).
- `npm run build` — production build; run this to validate changes (`next lint` no longer exists; `npm run lint` runs ESLint directly).
- `npx tsc --noEmit` — typecheck.

There is no test suite yet. Validate by building and clicking through the dashboard flows (see README for Supabase setup).
