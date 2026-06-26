# Deploy Guide — The Reading Marathon

This app is now **one service**. The Node/Express backend serves the website itself
(from `public/index.html`) *and* the API under `/api`. You deploy it once and you get a
single public URL that works for everyone — no separate frontend host, no CORS setup,
no hand-edited API address.

That is the whole point of the rewrite. The old two-service setup (backend on Render +
frontend on Netlify + manually pasting the API URL into the HTML) is gone. It was the
single biggest "works on my machine but not anyone else's" trap, because the moment the
backend URL changed, the deployed frontend silently broke.

---

## What you need (5 minutes, all free)

1. A **GitHub** account — https://github.com
2. A **Render** account — https://render.com (sign up with the GitHub button)

That's it. No credit card for the free tier.

---

## Step 1 — Put this folder on GitHub

This folder (the one containing `server.js`, `package.json`, `public/`, `render.yaml`) is
the entire app. Push it to a new GitHub repository.

If you've never used git, the no-terminal way:

1. Go to https://github.com/new, name the repo `reading-marathon`, click **Create repository**.
2. On the next page click **uploading an existing file**.
3. Drag in *everything inside this folder* (including the `db`, `models`, `routes`,
   `middleware`, and `public` folders). Commit.

> Do **not** upload `node_modules` if it exists, and don't worry about it — `.gitignore`
> already excludes it. Render installs dependencies itself.

---

## Step 2 — Deploy on Render (one click via Blueprint)

This repo ships a `render.yaml`, so Render can configure everything automatically.

1. In Render: **New +** → **Blueprint**.
2. Connect your GitHub and pick the `reading-marathon` repo.
3. Render reads `render.yaml`, shows you the service `reading-marathon`, and fills in:
   - Build command: `npm install`
   - Start command: `npm start`
   - `JWT_SECRET` — generated for you (a strong random value)
   - `DB_PATH=/data/marathon.sqlite` — the database file location
4. Click **Apply**. First build takes ~2–3 minutes.

When it goes green you get a URL like `https://reading-marathon.onrender.com`.
**Open it. That is your live site.** Share that one link with anyone.

> Why this just works for everyone: the page calls the API at a *relative* path (`/api`),
> so the API is always wherever the page is. There is no URL to configure and nothing to
> keep in sync.

---

## Step 3 — First login

A brand-new deployment starts **empty** — no users, no books, no posts. That is correct
behaviour for a real community site. Two choices:

### Option A — Just use it (recommended for the real launch)
Open the site, click **Create account**, sign up. You're in. Every member can:
add/borrow books to the shelf, log reading progress, post quotes/updates/notes, comment,
react, set goals, and add upcoming events. Nothing is gated — there is no admin wall in
your way.

### Option B — Load demo content first (only if you want a populated demo)
If you want the site pre-filled with 8 sample readers, 14 books, sample posts and events
so it doesn't look empty in a screenshot or pitch:

1. In Render, open your service → **Shell** tab.
2. Run: `npm run seed`
3. Log in with `aisha@speakingfraternity.org` / `marathon123` (this seeded account is the
   one **admin**, which only means "can delete anyone's event"; everything else is open to
   all members anyway).

> ⚠️ **Do not run `npm run seed` again after real people have signed up.** The seed script
> wipes every table and reloads the demo set. It's a *reset-to-demo* button, not a
> *top-up*. Run it once before launch, or never.

---

## The one honest caveat: data persistence on Render free tier

SQLite stores everything in a single file. Where that file lives decides whether your
data survives.

- **Render Free plan: there is no persistent disk.** Your service also *sleeps* after
  ~15 minutes of inactivity and the filesystem is **ephemeral** — every redeploy (and
  some restarts) starts from a blank database. Fine for testing and demos. **Not fine for
  a real community whose reading logs must not vanish.**

- **Render Starter plan ($7/month): keep the `disk:` block** that's already in
  `render.yaml`. It mounts a 1 GB persistent disk at `/data`, and `DB_PATH` points the
  database there (`/data/marathon.sqlite`). Now the data survives redeploys and restarts
  permanently. This is the configuration you want the moment the marathon is "for real."

If you stay on Free for now: the `render.yaml` already includes the disk block. Render's
free plan will simply ignore/refuse the disk — if the Blueprint errors on it, delete the
five `disk:` lines, redeploy, and accept that data is temporary until you upgrade.

### If you outgrow SQLite
For dozens of concurrent writers or guaranteed durability without managing a disk, move to
Postgres (Render offers a free managed Postgres instance). That's a code change in
`db/connection.js` and the models' SQL, not a config tweak — out of scope here, but the
clean migration path is: keep the same table shapes, swap `better-sqlite3` for `pg`, and
convert the handful of SQLite-specific bits (`datetime('now')`, `AUTOINCREMENT`). Flag it
when you get there.

---

## Running it locally (optional, for development)

```bash
npm install
npm run seed     # optional: load demo data
npm start
```

Open http://localhost:4000. The same single server serves both the site and the API. The
local database file defaults to `./db/marathon.sqlite` (override with `DB_PATH`).

> Local note: `better-sqlite3` compiles a native binary on `npm install`. On Render this
> is automatic on Node 20 (pinned via `.node-version` and `package.json` `engines`). If a
> local install fails to build, make sure you're on Node 20.x.

---

## What changed from the original deploy guide (so you're not confused)

| Old setup | New setup |
|---|---|
| Backend on Render **and** frontend on Netlify | **One service** on Render |
| Hand-edit `API_BASE` URL inside the HTML | Nothing to edit — relative `/api` |
| Configure CORS allowed origins | Not needed — same origin |
| Two URLs to manage | **One URL** |
| Icons/links were decorative | All icons and nav are functional |
| No way to add books / events / goals / log progress | All of it works from the UI |
