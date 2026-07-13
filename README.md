# Buddy Script — Social Feed

A full-stack social feed built for the AppifyLab Full Stack Engineer selection
task. Users register, log in, and share posts (text and/or image) that everyone
can see, or keep private to themselves. Posts, comments, and replies can all be
liked, and you can see exactly who liked each one.

- **Frontend:** Vite + React 19 + TypeScript, TanStack Query, Zustand, React Router
- **Backend:** Node + Express (TypeScript, ESM), Prisma, PostgreSQL
- **Auth:** JWT access tokens (in-memory) + rotating, hashed refresh tokens (httpOnly cookie)

The UI reuses the provided Buddy Script design (Bootstrap 5 + the supplied
`common/main/responsive` CSS), including the full navigation bar, stories strip,
light/dark theme, and both sidebars. A few purely decorative destinations that
have no MVP backend (chat, friend requests, notifications feed, social graph) are
rendered as faithful shells — the icons, dropdowns, and sidebar cards match the
mockup but list static/empty content rather than live data.

---

## Feature checklist (from the brief)

| Requirement | Status |
| --- | --- |
| Register with first name, last name, email, password | ✅ |
| Secure token/session auth, protected feed | ✅ JWT + refresh-cookie |
| Feed shows all users' posts, newest first | ✅ cursor pagination |
| Create post with text and/or image | ✅ multipart upload |
| Public (everyone) vs private (author-only) posts | ✅ enforced server-side |
| Like / unlike posts with correct state | ✅ optimistic UI |
| Comment, and reply to comments | ✅ 2-level threads |
| Like / unlike comments and replies | ✅ |
| See who liked a post / comment / reply | ✅ "Liked by" modal |

### Beyond the brief (design parity)

| Feature | Notes |
| --- | --- |
| Edit a post (content + visibility) | Owner-only, from the post `⋮` menu |
| Edit a comment / reply | Owner-only, inline |
| Search posts | Backend `GET /posts?q=` (indexed), debounced search box |
| Light / dark theme | Uses the design's `._dark_wrapper` theme, persisted |
| Share (copy link) | Copies a permalink to the post |
| Hide a post | Dismisses it from the current session view |
| Full nav, stories, sidebars | Rendered to match the mockup |

---

## Quick start

### Backend + database (Docker)

The server and Postgres run as a two-container Docker Compose stack — this is
the supported way to run the backend on a VPS or any Docker host.

```bash
cp .env.example .env          # then fill in JWT secrets + CLIENT_ORIGIN
docker compose up -d --build  # builds the server image, starts db + server
```

This applies Prisma migrations automatically on startup and exposes the API on
`http://localhost:4000` (override with `SERVER_PORT` in `.env`). Uploaded
images and the Postgres data both live in named Docker volumes, so they
survive `docker compose down` / restarts.

Seed demo data (4 users + sample posts) once the stack is up:

```bash
docker compose exec server npm run db:seed
```

Demo logins (seed): `alice@buddyscript.dev` … `dylan@buddyscript.dev`,
password `password123`.

To run the server without Docker instead (e.g. for local development against
`npm run dev`'s hot reload), point it at any Postgres instance:

```bash
cd server
cp .env.example .env          # then edit DATABASE_URL + JWT secrets
npm install
npm run prisma:migrate        # create the schema
npm run db:seed               # optional: 4 demo users + sample posts
npm run dev                   # http://localhost:4000
```

### Client

The client is a static SPA — it isn't part of the Docker stack. Build it and
serve `client/dist` from any static host / reverse proxy pointed at the API,
or run it locally against either backend above:

```bash
cd client
npm install
npm run dev                   # http://localhost:5173
```

The client reads the API base URL from `client/.env`
(`VITE_API_URL=http://localhost:4000/api`).

---

## Architecture

```
client/                         server/
  src/                            src/
    store/authStore.ts  ← Zustand   modules/
    api/                             auth/     register · login · refresh · me
      posts.ts   comments.ts         posts/    feed · create · like · likers
    components/                      comments/ comment · reply · like · likers
      PostCard  CommentThread       lib/       jwt · password · pagination · upload
      CreatePost  LikersModal       middleware/ auth · validate · error
      Navbar  Avatar  *Route        prisma/    schema · migrations · seed
    pages/  Login · Register · Feed
```

### State management

- **Server state** lives in **TanStack Query** — the feed, comments, replies, and
  "who liked" lists are all queries/mutations with cache updates. Likes use
  optimistic updates and reconcile against the server's authoritative counts.
- **Client/session state** lives in a single **Zustand** store (`authStore`) — the
  current user, auth status, and login/register/logout/bootstrap actions. This is
  the one piece of genuinely global client state, so it's the only place Zustand is
  used; everything else stays local component state.

### Auth flow

1. Login/register returns a short-lived **access token** (kept in memory only,
   never `localStorage`) and sets a **refresh token** as an `httpOnly` cookie.
2. Axios attaches the access token; on a `401` it transparently calls
   `/auth/refresh` once (single-flight, so concurrent 401s share one refresh) and
   retries the original request.
3. Refresh tokens are random 48-byte values stored **only as SHA-256 hashes**, and
   are **rotated** on every refresh (old token revoked). On app load the client
   silently bootstraps a session from the cookie.

---

## Data model

`User · Post · Comment · PostLike · CommentLike · RefreshToken` (see
[`server/prisma/schema.prisma`](server/prisma/schema.prisma)).

- **Comments** self-reference via `parentId` and are capped at 2 levels
  (comment → reply); replying to a reply is rejected server-side.
- **Separate like tables** (`PostLike`, `CommentLike`) rather than one polymorphic
  table — this keeps real foreign keys and cascade deletes, and each has a
  `@@unique([userId, …])` constraint so a like is idempotent by construction.

---

## Designed for scale & security

The brief asked to assume millions of posts and reads, with security and UX first.

**Read scale**
- **Cursor-based pagination** (`take limit + 1`) everywhere — no `OFFSET`, so page
  N costs the same as page 1.
- **Denormalized counters** (`likeCount`, `commentCount`, `replyCount`) updated in
  the same transaction as the write, so rendering the feed never runs `COUNT(*)`.
- **Composite indexes** matching the query patterns (feed ordering, per-post
  comments, like lookups).
- **Batched like-state** — a page of posts resolves the viewer's `likedByMe` in one
  query keyed by the ids, avoiding N+1.

**Security**
- Passwords hashed with **bcrypt** (cost 12); refresh tokens hashed at rest.
- All input validated with **Zod**; ownership checked before deletes.
- **helmet**, CORS locked to the client origin with credentials, and
  **rate-limited** auth endpoints.
- Uploads are constrained by MIME type and size and stored under random filenames.
- Private posts are filtered in the query itself (`PUBLIC` OR `author = viewer`),
  never trusting the client.

---

## Notes & trade-offs

- Image uploads are written to local disk (`server/uploads`) for simplicity; in
  production this would be object storage (S3/GCS) behind a CDN. The counters and
  pagination design is what would carry the "millions of rows" requirement.
- The design's non-feed screens (chat, notifications, friend requests) are out of
  scope and not implemented.
```
