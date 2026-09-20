# Qyka Frontend

Next.js 15 (App Router) + React 19 + Tailwind CSS 3.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

App runs at [http://localhost:3003](http://localhost:3003) (pinned in `package.json` so it doesn’t collide with other Next apps that often claim `:3000`). Point `NEXT_PUBLIC_API_BASE_URL` at the FastAPI backend (default `http://localhost:8000`). Ensure the backend `ALLOWED_ORIGINS` includes `http://localhost:3003`.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm start` — serve production build
- `npm run lint` — ESLint

## Marketing site

Logged-out `/` is the public marketing page (hero, how-it-works, customer waitlist, agent apply, partner contact). Authenticated users hitting `/` are redirected to their role home.
