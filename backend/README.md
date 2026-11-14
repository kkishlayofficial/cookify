# COOKify backend

Node.js + Express + TypeScript API for COOKify, backed by PostgreSQL (Prisma 7) and Socket.io for real-time chat/notifications. See the [repo root README](../README.md) for the full feature tracker and architecture notes; this file is a map of the backend codebase itself.

## Setup

```bash
cp .env.example .env     # see below for what to fill in
npm install
npm run prisma:migrate   # applies the schema to your local Postgres
npm run db:seed          # creates demo users + recipes
npm run dev               # http://localhost:4000
```

Requires a local PostgreSQL server (see the root README's "Quick start" for a one-time `createdb`/role setup). SMTP vars can be left blank — the mailer auto-provisions an [Ethereal](https://ethereal.email) test account on boot if none are configured.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Runs the API with `tsx watch` (auto-restart on change) |
| `npm run build` | Type-checks and compiles to `dist/` (`tsc` + `tsc-alias` for path aliases) |
| `npm start` | Runs the compiled `dist/server.js` |
| `npm test` | Runs the Jest suite (`--runInBand --forceExit`, since tests share one Postgres connection) |
| `npm run prisma:migrate` | `prisma migrate dev` — applies/creates migrations against your local DB |
| `npm run prisma:generate` | Regenerates the Prisma client into `src/generated/prisma` |
| `npm run prisma:studio` | Opens Prisma Studio against the local DB |
| `npm run db:seed` | Runs `prisma/seed.ts` — demo users, recipes, ratings |

## Project structure

```
src/
  server.ts            # process entrypoint: creates the HTTP server, attaches Express + Socket.io
  app.ts               # Express app wiring: middleware, route mounting, error handlers
  config/env.ts        # parses/validates process.env once at boot
  lib/                 # cross-module utilities (see below)
  middleware/          # auth, rate limiting, upload handling, validation, error handling
  modules/             # one folder per domain, each owning its routes/service/validation
    auth/              # signup, login, 2FA, refresh/logout, forgot/reset password
    users/              # profile, follow/unfollow, saved recipes, ban (admin)
    recipes/           # CRUD, search/filtering, ratings, media upload
    comments/          # comments + NSFW moderation hook
    notifications/     # in-app + emailed notifications (follow, rating, warning, ban, new recipe)
    chat/              # 1:1 chat REST history/fallback (see sockets/ for the live transport)
    devmail/           # dev-only endpoint for reading "sent" emails (disabled in production)
  sockets/chat.socket.ts  # Socket.io server: auth, rooms, message relay
  generated/prisma/    # generated Prisma client (not hand-edited; regenerate, don't diff-review)
prisma/
  schema.prisma        # data model
  migrations/          # one folder per migration, applied in order
  seed.ts              # demo data
uploads/               # locally stored recipe media + avatars, served at /uploads
```

Each `modules/<name>/` folder follows the same shape: `*.routes.ts` (Express router, wires middleware), `*.service.ts` (business logic, talks to Prisma), `*.validation.ts` (Zod schemas used by both the router and, for request-shape tests, directly).

## `lib/` reference

| File | Purpose |
| --- | --- |
| `prisma.ts` | Prisma client singleton (driver-adapter based, `@prisma/adapter-pg`) |
| `jwt.ts` | Signs/verifies access + refresh JWTs |
| `tokens.ts` | Random token generation (refresh tokens, 2FA codes, reset tokens) |
| `hash.ts` | bcrypt password hashing, SHA-256 token hashing |
| `authz.ts` | `assertAccountActive` — re-checks ban/role status against the DB on every authenticated request, so a ban takes effect on the very next request rather than waiting for the access token to expire |
| `mailer.ts` | Sends transactional email; auto-provisions an Ethereal test account when no real SMTP is configured; every send is also logged to the `DevMail` table |
| `realtime.ts` | Lets REST services (e.g. notifications) emit Socket.io events to a user's room without importing the socket server directly |
| `apiError.ts` | Typed `ApiError` used across services; mapped to HTTP responses by `middleware/errorHandler.ts` |
| `placeholderImage.ts` | Generates a tiny placeholder PNG on the fly (used where a recipe/user has no uploaded image) |
| `params.ts` | Small query-param coercion helpers shared by validation schemas |

## API surface

All routes are mounted under `/api` in `app.ts`:

| Prefix | Covers |
| --- | --- |
| `/api/auth` | signup, login, 2FA verify, refresh, logout, forgot/reset password |
| `/api/users` | profile (get/update), avatar upload, follow/unfollow, saved recipes, admin ban |
| `/api/recipes` | create/update/delete, search + filters, ratings, media upload |
| `/api/comments` | create/list comments (recipe-scoped), moderation runs inline on create |
| `/api/notifications` | list/mark-read |
| `/api/chat` | conversation + message history (REST fallback/history; live delivery is Socket.io) |
| `/api/dev-mail` | read "sent" emails for local testing — disabled when `NODE_ENV=production` |

`GET /health` is unauthenticated and outside `/api`.

## Notable implementation details

- **Live ban enforcement**: `requireAuth` (`middleware/auth.ts`) calls `assertAccountActive` on every request, not just at login/refresh — so banning a user takes effect on their very next API call or socket event, even mid-session.
- **Popularity sort is computed live**: `fetchRecipePage` in `modules/recipes/recipes.service.ts` scores every matching recipe at query time (`viewCount`, rating signal, and age decay) rather than reading a stored, event-triggered column — so the ranking reflects the recipe's current age instead of a stale snapshot from whenever it was last viewed or rated.
- **Follow-aware search**: when the viewer follows anyone, `searchRecipes` splits results into a "followed authors" pool and an "everyone else" pool (each still respecting the requested sort) and fills each page with followed-author recipes first.
- **Rate limiting**: `middleware/rateLimit.ts` applies per-IP limiters to the auth endpoints most attractive to brute-force/enumeration abuse; relies on `app.set("trust proxy", ...)` in `app.ts` being set correctly behind a real reverse proxy in production.
- **Real-time chat**: `sockets/chat.socket.ts` authenticates a socket with the same access-token cookie REST uses (falls back to an `auth.token` handshake field for non-browser clients) and joins the user to a `user:<id>` room, which `lib/realtime.ts` also targets for notification pushes.
- **Testing**: Jest covers validation/pure logic (password rules, NSFW detection, search-filter coercion), targeted behavior (live ban enforcement, mailer fallback, chat socket auth), and a full integration test (`src/app.integration.test.ts`) that drives signup → recipe CRUD → search/sort → rating → follow → ban end to end against a real Postgres instance.
