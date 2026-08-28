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

## Database schema

- `users` — id, username (unique), email (unique), password_hash
- `profiles` — one per user: name, title, bio, avatar_url
- `items` — bio entries: text / link / text_link / image, sort order, visibility
