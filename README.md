# me2IB — your recruiting HQ

A cozy, all-in-one hub for students navigating business recruiting (finance, consulting, and beyond): contact tracking with follow-up nudges, an application tracker organized by industry/tier/sector, a calendar with smart suggestions, document storage, interview prep, and a personalized recruiting roadmap.

Built with Next.js 16 (App Router), Supabase (auth + Postgres + storage), and Tailwind CSS v4.

## Features

| Area | What it does |
|---|---|
| **Contacts** | Track who you know, how you met, connection strength, shared interests; staleness badges + "I reached out today" so nobody goes cold. |
| **Applications** | The centerpiece: apps grouped by industry → tier (BB/EB/MM…, MBB/T2/Big4…), with status pipeline, materials checklist, deadlines, links, referral contact, interview notes. |
| **Calendar** | Month view + upcoming list; add coffee chats, interviews, deadlines; rule-based smart suggestions from your contacts & deadlines. |
| **Opportunities** | Manual opportunity board with one-click "Add to tracker"; curated job-hunt links. AI scanning is a placeholder for now. |
| **My Plan** | Punch in school + grad date → see where you are on the recruiting timeline and what to do this phase. AI roadmap is a placeholder for now. |
| **Documents** | Upload resumes/cover letters to private storage or paste text; organize by type + target industry. AI review is a placeholder for now. |
| **Experience** | Log jobs/clubs/projects with bullets; compile into a copy-paste resume view. |
| **Story Bank** | Store behavioral answers ("tell me about a challenge…") organized by category with strength ratings. |
| **Practice** | Real study material: finance technicals Q&A, consulting case frameworks, STAR method. |
| **Resources** | Curated guides (WSO, BIWS, M&I, Management Consulted…), news, and networking tools. |
| **FAQ** | Public, plain-English explainer of the whole recruiting game: timelines, tiers, networking 101. |

## Run it locally

Prereqs: Node.js ≥ 20.9, a free [Supabase](https://supabase.com) project.

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment** — create `.env.local` in the project root (see `.env.example`):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your publishable/anon key>
   ```

   Both values are in the Supabase dashboard → Project Settings → API.

3. **Create the database** — open the Supabase dashboard → **SQL Editor** → New query, paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates all tables, row-level-security policies (each user can only ever see their own data), triggers, and the private `documents` storage bucket. Safe to re-run.

4. **(Optional, for local testing)** In Supabase → Authentication → Providers → Email, you can disable "Confirm email" so signups log in instantly. Leave it ON for production.

5. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000, sign up, and go.

## Deploy publicly (recommended: Vercel)

1. Re-run the full [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor. It is idempotent and applies any new tables, columns, policies, and storage buckets before the new UI goes live.
2. Push this repo to GitHub.
3. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo. Vercel auto-detects Next.js; no custom build settings are needed.
4. In the project's **Settings → Environment Variables**, add these for Production (and Preview if you use preview deployments):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` — the canonical `https://your-app.vercel.app` or custom-domain URL
   - `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` — server-side secrets; never prefix them with `NEXT_PUBLIC_`
   - Optional: `AI_PROVIDER=openai` or `AI_PROVIDER=anthropic` when both provider keys are configured
5. Deploy. You'll get a `your-app.vercel.app` URL (add a custom domain later in Settings → Domains, then update `NEXT_PUBLIC_SITE_URL`).
6. In Supabase → **Authentication → URL Configuration**, set **Site URL** to the canonical production URL and add `https://your-app.vercel.app/auth/callback` to **Redirect URLs**. Keep `http://localhost:3000/**` for local development; add a carefully scoped Vercel preview wildcard only if you use preview authentication.

That's it — Supabase hosts the database/auth/storage, Vercel hosts the app. Both have generous free tiers.

## AI providers

The live AI endpoints are implemented in [`app/api/ai/route.ts`](app/api/ai/route.ts). They cover document review, plan generation, outreach drafts, opportunity scanning, LinkedIn contact import, and job-posting autofill. AI Chat and Math Gym AI Practice intentionally remain locked previews.

Add `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` to `.env.local` locally and to Vercel's encrypted environment variables in production. Admins choose the site-wide model in **Account → AI engine**; the choice is stored in Supabase rather than an environment file.

## Project docs

- [`AGENTS.md`](AGENTS.md) — project overview + conventions for AI coding assistants (Claude Code, Codex).
- [`docs/nextjs16-conventions.md`](docs/nextjs16-conventions.md) — Next.js 16 breaking-changes cheat-sheet (generated from the bundled docs).
- [`docs/feature-conventions.md`](docs/feature-conventions.md) — patterns every feature follows.
- [`supabase/schema.sql`](supabase/schema.sql) — the entire database, one file.

---

Created by [Reyan Datta](https://www.linkedin.com/in/reyandatta/) · Northwestern University · Just as confused about recruitment as you were.
