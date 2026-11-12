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

Status legend: ✅ Built · 🟡 Partial · ⬜ Pending

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
| Filter: popularity | ✅ | Recency-weighted trending score, recalculated on each view |
| Filter: regionality, food/course type | ✅ | `cuisineRegion` / `courseType` free-text filters (test table) |
| Search by title/creator | ✅ | |
| Comments + star ratings | ✅ | Rating is averaged per recipe; comment triggers an email to the recipe owner |
| NSFW/profanity comment filtering | ✅ | Blocks the comment, warns the commenter, emails the recipe owner |
| Ban system (3 warnings) | ✅ | Soft-removes the user's recipes/comments from public view, revokes all sessions |
| Admin manual ban | ✅ | `POST /api/users/:username/ban` (admin only), independent of the 3-warning flow |
| Subscriptions (follow) + email on new recipe | ✅ | |
| Built-in 1:1 chat | ✅ | Socket.io real-time + REST fallback/history |
| Multi-language UI (Hindi, Mandarin, Russian, Spanish, French) | 🟡 | UI chrome translated via static dictionaries; **recipe content itself is not machine-translated** (would require a paid Google Translate API call per view) — explicit scope decision, not a bug |
| Modern UI (sliders, buttons, interactive filters) | 🟡 | See frontend section below |
| Saved/bookmarked recipes | ✅ | Extra, from the wireframe's profile page |
| Group chat | ⬜ | Out of scope — 1:1 only, per the 2-day budget |
| Automated tests | ✅ | Password rules, NSFW detection, search-filter coercion, and a full auth→recipe→search→rating→ban integration test (`backend/src/app.integration.test.ts`) |

## Architecture notes

- **Auth**: JWT access token (15 min) in an httpOnly cookie + a device-bound, rotating refresh token (30 days) — this is the "remember this device" mechanism. Passwords and 2FA codes are bcrypt-hashed; refresh tokens are SHA-256-hashed (needs to be looked up deterministically) and also carried as a signed JWT so a leaked DB row alone can't forge a session.
- **Database**: PostgreSQL via Prisma 7 (driver-adapter based — see `backend/src/lib/prisma.ts`). Schema in `backend/prisma/schema.prisma` normalizes the brief's ER diagram into proper join tables for ingredients/utensils (enabling the "what can I cook" filters) and adds tables for devices, 2FA codes, warnings, follows, notifications, chat, and saved recipes.
- **Moderation**: `leo-profanity` flags NSFW comments before they're ever persisted as visible; 3 flags bans the account and cascades a soft-removal of their public content (not a hard delete, so there's still an audit trail).
- **Email**: all transactional email goes through `backend/src/lib/mailer.ts`, which auto-provisions an Ethereal test account if no real SMTP credentials are configured — genuinely sent, nothing mocked out, just viewable without a real inbox.
- **Real-time chat**: Socket.io server in `backend/src/sockets/chat.socket.ts`, authenticated via the same access-token cookie used by REST; falls back to `auth.token` for non-browser clients.

## Known limitations (documented, not accidental)

- Deployment target is **local only** — no cloud hosting, CDN, or production email/SMS provider is configured.
- An already-issued 15-minute access token for a user who gets banned mid-session remains valid until it expires (their refresh token and all other sessions are revoked immediately; only the current access token has a short natural lifetime).
- Recipe content (titles/instructions) is not machine-translated — only static UI strings are.
