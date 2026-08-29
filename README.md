# BioSpot

One page for everything you are — a bio/link-in-bio service for everyone.

Design extracted from `alnemer155/bio-abdullah` (monochrome black theme, Inter,
zero-radius borders, fade-up animations) and rebuilt on **Vite**.

## Features

- **Landing page** at `/` — BioSpot, bio for everyone
- **Registration** at `/register` — username (`bio.jaafar.app/@XXXX`), email, password
- **Sign in** at `/login` (email or username + password)
- **Dashboard** at `/dash` — edit profile, add/reorder/hide links, texts & images,
  live preview, QR code, undo/redo (Ctrl+Z), autosave
- **Public bio page** at `/@username`

## Stack

- Frontend: Vite + React + TypeScript + Tailwind CSS + React Router
- API: **Cloudflare Pages Functions** (`functions/api/`) using the Neon serverless
  driver — same-origin with the frontend, no separate server needed
- Alternative API: Express server (`server/`) for any Node host — same endpoints,
  same PBKDF2 password hashing
- Database: Neon PostgreSQL, schema auto-created on first request

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
