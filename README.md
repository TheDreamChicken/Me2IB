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

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo. Vercel auto-detects Next.js; no build settings needed.
3. In the project's **Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values as `.env.local`).
4. Deploy. You'll get a `your-app.vercel.app` URL (add a custom domain later in Settings → Domains).
5. Back in Supabase → **Authentication → URL Configuration**: set **Site URL** to your deployed URL and add `https://your-app.vercel.app/auth/callback` to **Redirect URLs** — this makes email-confirmation links land back on your site.

That's it — Supabase hosts the database/auth/storage, Vercel hosts the app. Both have generous free tiers.

## Enabling the AI features (later)

The AI endpoints are already scaffolded in [`app/api/ai/route.ts`](app/api/ai/route.ts) (document review, plan generation, outreach drafts, chat, opportunity scanning via web search). The UI currently shows "coming soon" placeholders. To activate them when ready:

1. Get an API key at [platform.claude.com](https://platform.claude.com).
2. Add `ANTHROPIC_API_KEY=sk-ant-...` to `.env.local` (and to Vercel env vars for production).
3. Wire the placeholder UI to `callAI(...)` from [`lib/ai-client.ts`](lib/ai-client.ts) — each placeholder card marks where.

## Project docs

- [`AGENTS.md`](AGENTS.md) — project overview + conventions for AI coding assistants (Claude Code, Codex).
- [`docs/nextjs16-conventions.md`](docs/nextjs16-conventions.md) — Next.js 16 breaking-changes cheat-sheet (generated from the bundled docs).
- [`docs/feature-conventions.md`](docs/feature-conventions.md) — patterns every feature follows.
- [`supabase/schema.sql`](supabase/schema.sql) — the entire database, one file.

---

Created by [Reyan Datta](https://www.linkedin.com/in/reyandatta/) · Northwestern University · Just as confused about recruitment as you were.
