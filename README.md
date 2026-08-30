# BioSpot

One page for everything you are — a bio/link-in-bio service for everyone.

Design extracted from `alnemer155/bio-abdullah` (monochrome black theme, Inter,
zero-radius borders, fade-up animations) and rebuilt on **Vite**.

## Features

- **Landing page** at `/` — BioSpot, bio for everyone
- **Registration** at `/register` — username (`bio.jaafar.app/@XXXX`), email, password
  (Supabase Auth; email confirmation configurable in the Supabase dashboard)
- **Sign in** at `/login`
- **Dashboard** at `/dash`:
  - **Agent** — AI bio generator (Gemini) that writes your page from a prompt and
    translates it into العربية / 日本語 / Français / Русский
  - **Twitter (X) import** — pull display name, avatar and handle from X
  - **Fonts** — IBM Plex Sans Arabic, Playfair Display, Noto Serif JP, Rubik,
    Baloo Bhaijaan 2 (plus default Inter)
  - **Templates** — coming soon
  - **Statistics** — page views, per-item clicks, last-7-days activity
  - **Share** — copy link, share to X / WhatsApp / Telegram
  - Profile & items editor with live preview, drag-and-drop, undo/redo, autosave, QR code
- **Public bio page** at `/@username`, with language variants
  `/ar/@username` (also `/ar/~/@username`), `/ja/…`, `/fr/…`, `/ru/…` — RTL for Arabic

## Stack

- Frontend: Vite + React + TypeScript + Tailwind CSS + React Router
- Auth: **Supabase Auth** (`@supabase/supabase-js`) — the frontend signs in and
  sends the access token; API verifies it against the Supabase Auth API
- API: **Cloudflare Pages Functions** (`functions/api/`) using the Neon serverless
  driver — same-origin with the frontend, no separate server needed
- Alternative API: Express server (`server/`) for any Node host — same endpoints
- Database: Neon PostgreSQL, schema auto-created on first request

## Environment variables

Cloudflare Pages (Production + Preview):

- `DATABASE_URL` — Neon Postgres connection string
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` — used by the API to verify tokens
- `GEMINI_API_KEY` — Google AI Studio key for the Agent

Build-time (Vite, used by the frontend):

- `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`

Local dev uses `.env` (Vite + Express) and `.dev.vars` (wrangler) — both gitignored.

## Run

```bash
npm install

# development (API on :8787 + Vite on :5173 with /api proxy)
npm run dev

# production
npm run build
npm start          # serves everything on http://localhost:8787
```

Environment variables live in `.env`:

- `DATABASE_URL` — Neon Postgres connection string
- `SESSION_SECRET` — secret for signing session tokens
- `PORT` — API/production port (default 8787)
- `CORS_ORIGIN` — (optional) frontend origin when the API is hosted separately;
  also switches session cookies to `SameSite=None; Secure`

## Deploying to Cloudflare Pages (everything in one project)

The API runs as Pages Functions, so no separate server is required:

1. In Cloudflare Pages, connect this repository with:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
2. In **Settings → Environment variables** add (Production and Preview):
   - `DATABASE_URL` — the Neon connection string
   - `SESSION_SECRET` — any long random string
3. Deploy. Registration, login and `/dash` now work on the Pages domain
   (`public/_routes.json` routes `/api/*` to the Functions; everything else is the SPA).

For local development of the Functions: `npx wrangler pages dev dist`
(reads secrets from `.dev.vars`).

The Express server (`server/`) remains available for Node hosting — endpoints are
identical, and passwords are hashed the same way in both.

> Cloudflare "path" fields (Page Rules, Workers Routes, Access…) reject special
> characters like `;|&()<>`. Enter plain path patterns only, e.g. `/*` — the
> domain goes in its own field, never in the path field.

## Database schema

- `users` — id, username (unique), email (unique), password_hash
- `profiles` — one per user: name, title, bio, avatar_url
- `items` — bio entries: text / link / text_link / image, sort order, visibility
