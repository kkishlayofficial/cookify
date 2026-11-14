# COOKify frontend

Next.js (App Router) + TypeScript + Tailwind CSS UI for COOKify. Talks to the [backend](../backend) directly over `fetch` with `credentials: "include"` — there's no server-side API proxy layer, since the Express backend already owns all auth/session state via cookies. See the [repo root README](../README.md) for the full feature tracker.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev     # http://localhost:3000
```

Requires the backend running (defaults to `http://localhost:4000`; see `.env.example` for the URL to point at a different backend).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the Next.js dev server with Turbopack |
| `npm run build` | Production build |
| `npm start` | Serves the production build |
| `npm run lint` | ESLint |

## Project structure

```
src/
  app/                        # App Router pages (one folder per route)
    page.tsx                   # home feed (search/filter/sort)
    recipes/new/                recipe creation form
    recipes/[id]/               recipe detail page
    recipes/[id]/edit/          recipe edit form
    profile/[username]/        public profile (follow, saved recipes, their recipes)
    chat/                      1:1 chat
    notifications/             notification list
    login/ signup/ forgot-password/ reset-password/   auth flows
    dev-mail/                  local-only "sent email" viewer
    layout.tsx                 root layout: providers, header/footer shell
  components/                 shared page-level components (header, footer, recipe card/form, comments, filters)
  components/ui/              small reusable primitives (button, badge, input, star rating, range slider, tag input, media carousel, ...)
  contexts/                   React context providers (see below)
  lib/                        fetch wrapper, types, and small framework-free helpers
```

## `contexts/` and `lib/` reference

| File | Purpose |
| --- | --- |
| `contexts/auth-context.tsx` | Client-side logged-in-user state; wraps `apiFetch` calls for login/logout/signup |
| `contexts/realtime-context.tsx` | Tracks unread notification/message counts, kept live via the Socket.io connection from `lib/socket.ts` |
| `lib/api.ts` | `apiFetch` — the fetch wrapper every page/component uses. Transparently calls `/api/auth/refresh` and retries once on a 401, so a 15-minute access token doesn't log the user out mid-session |
| `lib/session.server.ts` | `getServerUser()` — resolves the logged-in user from the incoming request's cookies inside a Server Component, so the first HTML response already reflects the real session instead of a logged-out flash that corrects itself after hydration |
| `lib/socket.ts` | Socket.io client, pinned to HTTP long-polling (`upgrade: false`) rather than upgrading to WebSockets — some sandboxed/proxied networks silently drop the WS upgrade handshake, and polling is reliable everywhere at the cost of marginally higher latency |
| `lib/types.ts` | Shared TypeScript types mirroring the backend's API shapes |
| `lib/dietary.ts` | Dietary-type labels/options shared by the recipe form and filters |
| `lib/passwordRules.ts` | Client-side mirror of the backend's password validation, for inline signup feedback |

## Notable implementation details

- **No i18n routing**: there's no `[locale]` segment or static translation dictionary. The header's language dropdown drives `components/GoogleTranslateWidget.tsx`, which translates the live, already-rendered DOM in place via the Google Translate website widget — no reload, and it covers dynamic content (recipe titles/instructions/comments) as well as static UI chrome.
- **Recipe detail layout** (`app/recipes/[id]/page.tsx`): a CSS grid using named `grid-template-areas` (not row-span placement) so the media column and the instructions column can each size to their own content height — avoids the dead whitespace that row-span-forced equal heights would otherwise leave. Sections with no content (empty ingredients/utensils/instructions, or zero comments with no logged-in user to post one) don't render at all. `components/ui/MediaCarousel.tsx` renders a sliding track (`translateX` + `transition-transform`) rather than swapping the image outright, and falls back to a "No image available" placeholder when a recipe has no media.
- **Auth persistence across reload**: `session.server.ts` (server-side) and `auth-context.tsx` (client-side) both read the same cookie-based session, so a logged-in user never sees a flash of logged-out UI on a hard refresh.
