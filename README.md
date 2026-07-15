# Buddy Script — Social Feed

Full-stack social feed app built for the AppifyLab Full Stack Engineer selection task.
Register, log in, and post text/images to a feed that's either public or private to
you. Posts, comments and replies can all be liked, and you can see who liked what.

Frontend is Vite + React 19 + TypeScript, with TanStack Query for server state and
Zustand for the small bit of client auth state. Backend is Node/Express (TypeScript,
ESM) with Prisma on Postgres. Auth is JWT access tokens plus a rotating refresh token
in an httpOnly cookie.

The UI is built on the Buddy Script design that was provided (Bootstrap 5 + the
supplied CSS) — nav bar, stories strip, sidebars, light/dark theme all match the
mockup. A handful of screens in that design (chat, friend requests, a real
notifications feed) don't have a backend behind them since they weren't part of the
brief, so those bits of UI are just static shells for now.

## What's implemented

From the brief: registration (first/last name, email, password), JWT auth with a
protected feed, a feed of everyone's posts newest-first, creating a post with text
and/or an image, public vs private posts (enforced server-side, not just hidden in
the UI), liking/unliking posts, commenting and replying, liking comments/replies, and
a "who liked this" list for posts/comments/replies.

Past that, I also added: editing your own posts and comments, a debounced search over
posts, the light/dark theme toggle from the design, copying a link to a post, and
hiding a post from your own view.

## Running it

**Backend + Postgres (Docker)** — this is the main supported path:

```bash
cp .env.example .env          # fill in JWT secrets + CLIENT_ORIGIN
docker compose up -d --build
```

Migrations run automatically on startup. API comes up on `http://localhost:4000`
(change with `SERVER_PORT` in `.env`). Uploads and Postgres data are both in named
Docker volumes so they survive restarts.

Seed some demo data once it's up:

```bash
docker compose exec server npm run db:seed
```

That creates 4 users (`alice@buddyscript.dev` through `dylan@buddyscript.dev`,
password `password123`) with sample posts.

If you'd rather run the server without Docker (e.g. for `npm run dev` hot reload),
point it at any Postgres instance:

```bash
cd server
cp .env.example .env          # edit DATABASE_URL + JWT secrets
npm install
npm run prisma:migrate
npm run db:seed               # optional
npm run dev                   # http://localhost:4000
```

**Client** is a static SPA, not part of the Docker stack:

```bash
cd client
npm install
npm run dev                   # http://localhost:5173
```

It reads the API URL from `client/.env` (`VITE_API_URL=http://localhost:4000/api`).

## Layout

```
client/src/
  store/authStore.ts   Zustand — current user, login/register/logout
  api/                 TanStack Query hooks (posts, comments)
  components/          PostCard, CommentThread, CreatePost, Navbar, etc.
  pages/                Login, Register, Feed

server/src/
  modules/
    auth/               register, login, refresh, me
    posts/              feed, create, like, likers
    comments/           comment, reply, like, likers
  lib/                  jwt, password hashing, pagination, upload handling
  middleware/           auth, request validation, error handling
  prisma/               schema, migrations, seed script
```

Server state (feed, comments, likes) all lives in TanStack Query — likes update
optimistically and reconcile against the server's real counts. Zustand only holds
auth/session state since that's the one thing that's genuinely global on the client;
everything else is local component state.

Auth: login/register hands back a short-lived access token (kept in memory, not
localStorage) plus a refresh token as an httpOnly cookie. Axios attaches the access
token and on a 401 calls `/auth/refresh` once — concurrent 401s share that single
refresh call instead of each firing their own. Refresh tokens are random values,
stored only as a SHA-256 hash, and rotated every time one's used.

Data model is `User / Post / Comment / PostLike / CommentLike / RefreshToken`, see
`server/prisma/schema.prisma`. Comments self-reference via `parentId` and are capped
at two levels (comment → reply); the server rejects replying to a reply. Post and
comment likes are separate tables rather than one polymorphic likes table, mainly so
each can have a real foreign key, cascade delete, and a `@@unique([userId, ...])`
constraint that makes a like idempotent by construction rather than relying on
application logic to prevent duplicates.

## A few decisions worth calling out

The brief mentioned assuming millions of posts, so a couple of things are there
specifically for that: feed/comment pagination is cursor-based (`take limit + 1`,
no `OFFSET`), so paging in doesn't get slower the deeper you go. Like/comment counts
are stored on the post itself and updated in the same transaction as the write,
instead of running a `COUNT(*)` every time the feed renders. Resolving whether the
viewer has liked each post in a page is one batched query by id, not one query per
post.

On the security side: bcrypt for passwords, refresh tokens hashed at rest, Zod
validation on all input, ownership checks before any edit/delete, helmet, CORS locked
to the client origin, rate limiting on the auth routes, and uploads restricted by
mime type/size with randomized filenames. Private posts are filtered out at the query
level (`visibility = PUBLIC OR authorId = viewer`) rather than trusting the client to
just not show them.

Uploaded images go to local disk (`server/uploads`) for now — in a real deployment
that'd move to S3/GCS behind a CDN, but wasn't worth the setup for this. Chat,
notifications, and friend requests are the parts of the design with no backend, and
are intentionally left as static UI only.
