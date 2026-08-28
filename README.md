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
- Backend: Express (Node) — serves the API and the built `dist/`
- Database: Neon PostgreSQL (`pg`), schema auto-created on first run
- Auth: scrypt password hashing + signed HttpOnly session cookie

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

## Deploying the frontend to Cloudflare Pages

The Express API cannot run on Cloudflare Pages (static hosting only), so:

1. Host the API (`npm start`) on any Node platform (VPS, Railway, Render, Fly.io…)
   and set `DATABASE_URL`, `SESSION_SECRET`, and `CORS_ORIGIN=https://<pages-domain>`.
2. In Cloudflare Pages create a project:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `VITE_API_URL=https://<api-domain>`
3. `public/_redirects` is included so `/@username`, `/dash` etc. fall back to
   `index.html` (SPA routing).

> Cloudflare "path" fields (Page Rules, Workers Routes, Access…) reject special
> characters like `;|&()<>`. Enter plain path patterns only, e.g. `/*` — the
> domain goes in its own field, never in the path field.

## Database schema

- `users` — id, username (unique), email (unique), password_hash
- `profiles` — one per user: name, title, bio, avatar_url
- `items` — bio entries: text / link / text_link / image, sort order, visibility
