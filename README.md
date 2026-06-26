# The Reading Marathon by Speaking Fraternity

A single Node service that serves **both** the website (`public/index.html`) **and**
the REST API (under `/api`): member progress tracking, the Community Shelf, the unified
post feed (progress updates, quotes, notes, discussions), reading goals, the weekly
leaderboard, and Fraternity Events.

Built with **Node.js + Express + SQLite** (via `better-sqlite3`) — no external database
server required, so it runs anywhere with zero infra setup.

**To deploy: see `DEPLOY-GUIDE.md`.** It's one service, one URL, no CORS, nothing to
hand-edit. The frontend talks to the API at a relative `/api` path, so it works for every
visitor without configuration.

## 1. Setup

```bash
npm install
cp .env.example .env       # then edit JWT_SECRET to something random & long
npm run seed                # OPTIONAL: creates db/marathon.sqlite + demo data
npm start                   # or: npm run dev (with nodemon, auto-restart)
```

Open `http://localhost:4000` — the same server serves the **site and the API**. The
schema is auto-applied on boot; `npm run seed` is optional demo data (and resets all
tables, so run it once or never on a live instance).

Demo accounts are created by `npm run seed`, all using the password
`marathon123`, e.g.:

```
aisha@speakingfraternity.org / marathon123
zaid@speakingfraternity.org  / marathon123
noor@speakingfraternity.org  / marathon123
```

## 2. Project structure

```
reading-marathon-backend/
├── server.js              # Express app entry point (serves public/ + /api)
├── public/
│   └── index.html          # the full website (talks to /api at a relative path)
├── db/
│   ├── connection.js       # better-sqlite3 connection
│   ├── schema.sql          # full table definitions
│   ├── migrate.js          # applies schema.sql (idempotent)
│   └── seed.js             # demo data matching the original mockup
├── models/                 # query layer, one file per entity
│   ├── User.js
│   ├── Book.js
│   ├── ReadingEntry.js
│   ├── PageLog.js
│   ├── Post.js
│   ├── Goal.js
│   └── Event.js
├── middleware/
│   ├── jwt.js               # sign/verify helpers
│   ├── auth.js              # requireAuth / requireAdmin
│   └── helpers.js           # asyncHandler, HttpError, requireFields
└── routes/
    ├── auth.js
    ├── users.js
    ├── books.js
    ├── readingEntries.js
    ├── posts.js
    ├── goals.js
    ├── leaderboard.js
    ├── events.js
    ├── notes.js
    └── dashboard.js
```

## 3. Authentication

All endpoints except `/api/auth/signup` and `/api/auth/login` require a
JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

You get the token back from `signup`/`login`. Tokens expire after
`JWT_EXPIRES_IN` (default 7 days).

## 4. API reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | `{ name, email, password }` → creates member, returns `{ token, user }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | Current user's profile |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | Fraternity member directory |
| GET | `/api/users/:id` | One member's profile |
| GET | `/api/users/:id/reading-entries` | What that member is/has been reading |

### Books & the Community Shelf
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/books` | Full book catalog |
| GET | `/api/books/shelf` | **The Community Shelf** — everyone's active reads, for the spine visualization |
| GET | `/api/books/:id` | One book |
| POST | `/api/books` | `{ title, author?, totalPages, spineColor? }` — add to catalog (reuses existing title if it already exists) |

### Reading entries (Member Progress)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reading-entries` | Member Progress feed (paginate with `?limit=&offset=`) |
| GET | `/api/reading-entries/:id` | One entry |
| POST | `/api/reading-entries` | `{ bookId, marathonId? }` — start reading a book |
| PATCH | `/api/reading-entries/:id/progress` | `{ currentPage, pagesReadToday? }` — update progress bar; `pagesReadToday` also logs to the weekly leaderboard and bumps your streak |

Status (`on_track` / `behind` / `finished`) is computed automatically from
pace (assumes a 14-day default reading window — tune `plannedDays` in
`models/ReadingEntry.js` if your marathon length differs).

### Posts (the 4 composer tabs + Quote Wall)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/posts?type=quote` | Feed, optionally filtered by `progress_update` \| `quote` \| `note` \| `discussion` |
| GET | `/api/posts/:id` | One post |
| POST | `/api/posts` | `{ type, body, bookId?, pageNumber?, readingEntryId? }` |
| DELETE | `/api/posts/:id` | Delete your own post |
| POST | `/api/posts/:id/resonate` | Toggle a ♡ "resonated" reaction |
| GET | `/api/posts/:id/comments` | List comments ("💬 Discuss") |
| POST | `/api/posts/:id/comments` | `{ body }` — add a comment |
| POST | `/api/posts/:id/save` | "📋 Save to notes" |
| DELETE | `/api/posts/:id/save` | Un-save |

### Notes
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notes` | Your saved notes (saved quotes/posts) |

### Goals
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/goals` | Your goal checklist |
| POST | `/api/goals` | `{ text, dueDate? }` |
| PATCH | `/api/goals/:id/toggle` | Check/uncheck |
| DELETE | `/api/goals/:id` | Remove a goal |

### Leaderboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/leaderboard?limit=5` | "Pages This Week" ranking |

### Events
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/events` | Upcoming Fraternity Events (`?all=true` for full history) |
| POST | `/api/events` | Admin-only: `{ title, description?, eventDate }` |
| DELETE | `/api/events/:id` | Admin-only |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/stats` | Hero stats row: `{ readers, booksActive, pagesThisWeek, quotesShared }` |

## 5. The frontend (already wired)

`public/index.html` is the complete, working website. It is **already** connected to this
API — every feature below is live, not mocked:

- Community Shelf renders from `GET /api/books/shelf`, with a modal to browse the catalog
  or add a new book (`POST /api/books`) and start reading it.
- Member Progress renders from `GET /api/reading-entries`; "Log pages" calls
  `PATCH /api/reading-entries/:id/progress` (which feeds the streak + weekly leaderboard).
- The composer posts to `POST /api/posts`, using the active tab to set `type`
  (`progress_update` | `quote` | `note` | `discussion`).
- Quote Wall resonate/save and the Discuss threads use the posts reactions/comments
  endpoints; Notes view reads `GET /api/notes`.
- Goals add/toggle/delete via `/api/goals`; leaderboard from `GET /api/leaderboard`.
- Fraternity Events list/add/delete via `/api/events` (any member can add; you can delete
  your own, an admin can delete any).

The JWT is held in memory (not `localStorage`). All nav links and icons are functional.
If you change the API, nothing in the HTML needs editing — it uses a relative `/api` base.

## 6. Notes on production hardening

This is a solid, complete starting point. Before deploying for real use,
consider:

- Move `JWT_SECRET` to a real secrets manager.
- Add refresh tokens if you want shorter-lived access tokens.
- Add request validation with a schema library (e.g. `zod`) if the API
  surface grows.
- Switch `better-sqlite3` to Postgres/MySQL if you expect heavy concurrent
  writes — SQLite (even in WAL mode) is great for a fraternity-sized group
  but not built for high write concurrency at scale.
- Add automated tests (the model layer is already split out cleanly for
  unit testing with something like `jest` or `vitest`).
