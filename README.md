# COOKify

A recipe-sharing platform with user accounts, filter-based recipe search, social features (ratings, comments, subscriptions), a built-in chat system, and multi-language support — built as a 2-day interview take-home against a provided technical brief (ER/UML diagrams, wireframes, pseudocode, and a 13-row test table).

This repo is split into two independent projects:

- [`backend/`](./backend) — Node.js + Express + TypeScript + PostgreSQL (Prisma 7) + Socket.io API
- [`frontend/`](./frontend) — Next.js + TypeScript + Tailwind CSS UI

## Quick start

### 1. Database

You need a local PostgreSQL server running. Then create the dev database/role once:

```bash
createdb cookify
psql postgres -c "CREATE ROLE cookify WITH LOGIN PASSWORD 'cookify' SUPERUSER;"
psql postgres -c "ALTER DATABASE cookify OWNER TO cookify;"
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # defaults already point at the DB above
npm install
npm run prisma:migrate   # applies the schema
npm run db:seed          # creates demo users + recipes (see below)
npm run dev               # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev               # http://localhost:3000
```

### Demo accounts (created by `npm run db:seed`)

| Email | Password | Notes |
| --- | --- | --- |
| admin@cookify.dev | AdminPassword123 | Admin role (can manually ban users) |
| asha@cookify.dev | AshaPassword123 | Has 2 recipes, followed by marco & lin |
| marco@cookify.dev | MarcoPassword123 | **2FA enabled** — after login, check the Dev Mailbox for the code |
| lin@cookify.dev | LinPassword123 | Vegan recipe author |

### Viewing "sent" emails

The backend sends real emails through an [Ethereal](https://ethereal.email) test account (no real inbox needed) for 2FA codes, password resets, follow/rating/warning/ban notifications. Every email is also logged to the `DevMail` table and viewable at:

```
GET http://localhost:4000/api/dev-mail?to=<email>
```

(disabled automatically if `NODE_ENV=production`)

## Feature tracker

Status legend: ✅ Built

| Feature (from the brief) | Status | Notes |
| --- | --- | --- |
| Sign up with username, unique ID, password rules | ✅ | ≥9 chars, no spaces, no restricted symbols (`<>{}[];'"`\`) |
| Profile pictures, short bios | ✅ | Avatar upload stored on local disk |
| Login with optional 2FA | ✅ | Email-delivered 6-digit code via Ethereal |
| Remember login details on devices | ✅ | Device-bound refresh token, httpOnly cookie, revocable |
| Forgot / reset password | ✅ | Emailed reset link, invalidates all sessions on reset |
| Recipes: text instructions + photo/video attachments | ✅ | Local disk storage, served via `/uploads` |
| Filter: available ingredients | ✅ | "What can I cook with what I have" — excludes recipes needing ingredients outside your list |
| Filter: required utensils/equipment | ✅ | Same exclusion logic as ingredients |
| Filter: cost/budget | ✅ | Min/max `costPerServing` range |
| Filter: prep/cook time | ✅ | Min/max on combined `totalTimeMins` |
| Filter: nutrition/calories | ✅ | Min/max calorie range (protein/carbs/fat stored, not yet filterable) |
| Filter: veg/non-veg | ✅ | Extended to 6 dietary types incl. eggetarian/pescetarian/jain (test table) |
| Filter: popularity | ✅ | Recency-weighted trending score combining views + ratings, computed live at query time (not a stale stored value) |
| Filter: regionality, food/course type | ✅ | `cuisineRegion` / `courseType` free-text filters (test table) |
| Search by title/creator | ✅ | |
| Comments + star ratings | ✅ | Rating is averaged per recipe; comment triggers an email to the recipe owner |
| NSFW/profanity comment filtering | ✅ | Blocks the comment, warns the commenter, emails the recipe owner |
| Ban system (3 warnings) | ✅ | Soft-removes the user's recipes/comments from public view, revokes all sessions |
| Admin manual ban | ✅ | `POST /api/users/:username/ban` (admin only), independent of the 3-warning flow |
| Subscriptions (follow) + email on new recipe | ✅ | Following also emails the followed account immediately, and boosts that author's recipes to the top of the follower's search/feed results |
| Built-in 1:1 chat | ✅ | Socket.io real-time (HTTP long-polling transport; see note below) + REST fallback/history |
| Multi-language UI (Hindi, Mandarin, Russian, Spanish, French) | ✅ | Live page translation via the Google Translate widget (`frontend/src/components/GoogleTranslateWidget.tsx`), switchable from the header — translates the entire rendered page, including recipe content, not just static UI chrome |
| Modern UI (sliders, buttons, interactive filters) | ✅ | COOKify cream/terracotta brand palette, Fraunces/Inter font pairing, dual-thumb range sliders for cost/time/calories, chip inputs for ingredients/utensils, card-based recipe grid |
| Saved/bookmarked recipes | ✅ | Extra, from the wireframe's profile page |
| Automated tests | ✅ | Password rules, NSFW detection, search-filter coercion, and a full auth→recipe→search→rating→ban integration test, including follow → notification → recommended-feed ordering (`backend/src/app.integration.test.ts`) |

## Architecture notes

- **Auth**: JWT access token (15 min) in an httpOnly cookie + a device-bound, rotating refresh token (30 days) — this is the "remember this device" mechanism. Passwords and 2FA codes are bcrypt-hashed; refresh tokens are SHA-256-hashed (needs to be looked up deterministically) and also carried as a signed JWT so a leaked DB row alone can't forge a session. The frontend's `apiFetch` wrapper (`frontend/src/lib/api.ts`) transparently calls `/api/auth/refresh` and retries once on a 401, so a user stays signed in across the 15-minute access-token lifetime without re-entering credentials.
- **Database**: PostgreSQL via Prisma 7 (driver-adapter based — see `backend/src/lib/prisma.ts`). Schema in `backend/prisma/schema.prisma` normalizes the brief's ER diagram into proper join tables for ingredients/utensils (enabling the "what can I cook" filters) and adds tables for devices, 2FA codes, warnings, follows, notifications, chat, and saved recipes.
- **Follow-based recommendations**: `searchRecipes` (`backend/src/modules/recipes/recipes.service.ts`) takes the viewer's ID (from `optionalAuth`) and, when they follow anyone, splits matching recipes into a "followed authors" pool and an "everyone else" pool, each respecting the requested sort, then fills each page with followed-author recipes first — so subscribing surfaces more of that author's recipes without otherwise changing the feed for logged-out or no-follow users.
- **Popularity sorting**: the "Most popular" sort uses a Hacker News–style gravity-decay formula: `(viewCount + avgRating × ratingCount × 10) / (ageHours + 2)^1.5`. Views contribute linearly; ratings are weighted so one 5-star rating ≈ 50 views, rewarding both quality and engagement. The score is computed live at search time for every matching recipe (not stored), so it always reflects the recipe's current age rather than a snapshot from whenever it was last viewed or rated. Recipe cards and the detail page display the view count alongside the star rating.
- **Moderation**: `leo-profanity` flags NSFW comments before they're ever persisted as visible; 3 flags bans the account and cascades a soft-removal of their public content (not a hard delete, so there's still an audit trail).
- **Email**: all transactional email goes through `backend/src/lib/mailer.ts`, which auto-provisions an Ethereal test account if no real SMTP credentials are configured — genuinely sent, nothing mocked out, just viewable without a real inbox.
- **Real-time chat**: Socket.io server in `backend/src/sockets/chat.socket.ts`, authenticated via the same access-token cookie used by REST (parsed with the `cookie` package's v2 `parseCookie` API); falls back to `auth.token` for non-browser clients. The frontend client (`frontend/src/lib/socket.ts`) is pinned to the HTTP long-polling transport (`upgrade: false`) rather than upgrading to raw WebSockets, since some sandboxed/proxied network environments silently drop the WS upgrade handshake and leave the socket disconnected instead of falling back gracefully; polling is slightly higher latency but reliable everywhere.
- **Translation**: the header's language dropdown drives the Google Translate website widget (`frontend/src/components/GoogleTranslateWidget.tsx`), which translates the live DOM in place — no reload, no per-page locale routing, and it covers dynamic content (recipe titles/instructions/comments) as well as static UI chrome, since it's translating whatever actually rendered rather than looking strings up in a static dictionary.
- **Frontend data fetching**: pages are client components that call the Express API directly via `fetch` with `credentials: "include"`, rather than proxying through Next.js server components/route handlers — simplest option for a 2-day build given the backend already owns all auth/session state via cookies.
