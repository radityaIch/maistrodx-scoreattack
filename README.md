# maistrodx score attack

maistrodx is a tournament platform for community maimai score competitions. It lets admins create tournaments, define scoring rules, add tracks, and review player submissions; it lets players log in, submit scores, and view public leaderboards.

This project is built with Next.js 16, React 19, TypeScript, Tailwind CSS, Prisma, PostgreSQL, and Better Auth. The app is designed for private or community-run tournaments where leaderboard visibility, moderation, and transparent scoring rules matter.

---

## What this app does

### Core functionality

- Admin creates tournaments with:
  - name, slug, description
  - registration window and submission deadline
  - scoring mode: aggregate or best N
  - max achievement percentage cap
  - theme settings: hero image, mascot, accent color, logo overlays, ruleset markdown
- Admin adds tracks to a tournament from the synced maimai catalog or from a custom AstroDX/community track form.
- Players sign in with Google.
- Players submit achievements with:
  - achievement percentage
  - screenshot URL
  - optional note
- Submissions are moderated by admins before appearing publicly on leaderboards.
- Public tournament pages show sections in an admin-defined order.
- Leaderboards use the tournament scoring rule and tie-break logic.
- Tournament submission windows auto-close when the deadline passes.

### Public user flow

1. User visits the landing page.
2. User selects an open tournament.
3. User sees tournament rules, track list, leaderboard, and results.
4. If logged in, user can navigate to the submit page for that tournament.
5. User adds a score submission and waits for admin approval.

### Admin flow

1. Admin signs in using a Google account whose email is in ADMIN_EMAILS.
2. Admin creates or edits a tournament.
3. Admin adds tracks and publishes the tournament.
4. Admin moderates incoming submissions.
5. Admin approves or rejects each entry.

---

## Technical overview

### Stack

- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- Prisma 6 + PostgreSQL
- Better Auth for Google login and session handling
- Cloudinary for asset storage and image uploads
- Vitest for unit tests

### Why the app is structured this way

This repo intentionally separates concerns:

- app/ contains routes and page composition
- src/lib/actions/ holds server actions for mutations
- src/lib/dal/ handles session and data access logic
- src/lib/maimai/ handles catalog syncing and artwork URLs
- prisma/schema.prisma defines the database schema
- app/api routes handle cron jobs and external integrations

This is a good pattern for a Next.js app because:

- Server Actions keep database mutations close to the feature
- Route handlers work well for cron jobs and API endpoints
- DAL functions keep read logic consistent and reusable
- Prisma handles the database model and relational constraints cleanly

---

## Main app features

### Tournament publishing and lifecycle

A tournament has a lifecycle:

- DRAFT: not publicly visible
- OPEN: accepting submissions
- CLOSED: no longer accepting submissions
- FINALIZED: completed and results locked

Admins can publish or close a tournament from the admin edit form.

### Ranking system

The app supports two scoring approaches:

- AGGREGATE: total all verified scores across tracks
- BEST_N: sum the top N verified scores only

Tie-breaking is also implemented:

- total percentage desc
- track count desc
- earliest submission asc

### Moderation model

Submissions begin in PENDING state.

- PENDING: not shown in public leaderboard
- VERIFIED: counted in leaderboard and results
- REJECTED: recorded with moderation reason and excluded from ranking

### Search and catalog support

The app has a maimai catalog sync feature that stores songs and sheets in the database for searching and tournament track assignment.

It supports:

- official synced catalog entries
- custom track entries for AstroDX or community-made tracks
- custom cover URL and download URL for a custom track

---

## Project structure

```text
.
├── app/
│   ├── admin/
│   ├── api/
│   ├── me/
│   ├── tournaments/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── components/
│   ├── lib/
│   └── __tests__/
├── public/
├── .env
├── .env.example
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── PLAN.md
├── README.md
└── tsconfig.json
```

---

## Local development prerequisites

Before running the app on your local machine, install:

- Node.js 20 or newer
- pnpm
- PostgreSQL 16 or newer
- Git
- A Google account for OAuth testing

On Windows, this is usually easiest with:

- Node.js LTS from nodejs.org
- PostgreSQL installed locally or via Docker
- Git Bash / PowerShell / VS Code terminal

---

## One-time environment setup

Create a file named .env in the project root and fill it with values like this:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maistrodx?schema=public"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="replace-with-long-random-string"
BETTER_AUTH_API_KEY="optional-for-local-dev"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

ADMIN_EMAILS="your-email@example.com"

MAIMAI_CF_BASE_URL="https://dp4p6x0xfi5o9.cloudfront.net/maimai"
MAIMAI_IMAGE_BASE_URL="https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover/"
NEXT_PUBLIC_MAIMAI_IMAGE_BASE_URL="https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover/"
MAIMAI_CRON_SECRET="replace-with-a-random-secret"

CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
CLOUDINARY_FOLDER="maistrodx"

NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="replace-with-long-random-string"
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""
```

Important notes:

- The value of ADMIN_EMAILS must match the email you use to sign in with Google.
- BETTER_AUTH_SECRET and NEXT_SERVER_ACTIONS_ENCRYPTION_KEY should be random secure strings.
- You can generate a secure value with:

```bash
openssl rand -base64 32
```

On Windows PowerShell, you can also generate secrets with:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

---

## Database setup

### Option 1: Local PostgreSQL

If you have PostgreSQL installed locally, create a database:

```sql
CREATE DATABASE maistrodx;
```

Then point DATABASE_URL to it.

### Option 2: Docker PostgreSQL (recommended if you want a quick local database)

From the project root:

```bash
docker run --name maistrodx-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=maistrodx -p 5432:5432 -d postgres:16
```

Then use:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maistrodx?schema=public"
```

---

## Install dependencies

In the project root:

```bash
pnpm install
```

If you are on Windows PowerShell:

```powershell
cd C:\path\to\maistrodx-scoreattack
pnpm install
```

---

## Generate Prisma client and initialize database

Run these commands once after the database is ready:

```bash
pnpm db:generate
pnpm db:migrate --name init
```

This will generate the Prisma client and apply the schema to PostgreSQL.

---

## Seed demo data

This creates a demo admin user and a sample tournament so the app has data to show immediately:

```bash
pnpm db:seed
```

If you want a fresh local database, you can reset it with:

```bash
pnpm db:reset
```

This destroys the data and reseeds it.

---

## Run the app locally

Start the dev server:

```bash
pnpm dev
```

Then open:

- http://localhost:3000

From there:

- sign in with Google
- ensure the signed-in email is included in ADMIN_EMAILS
- open the admin area or create a tournament

Typical admin route:

- /admin/tournaments/new

Typical public routes:

- /
- /tournaments/<slug>
- /tournaments/<slug>/submit
- /tournaments/<slug>/leaderboard

---

## Useful scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm test
pnpm db:generate
pnpm db:migrate
pnpm db:studio
pnpm db:seed
pnpm db:reset
```

### What each does

- dev: starts Next.js in development mode
- build: does a production build
- start: runs the built app
- lint: runs ESLint
- typecheck: TypeScript validation
- test: runs Vitest
- db:generate: regenerates Prisma client
- db:migrate: applies schema migrations
- db:studio: opens Prisma Studio
- db:seed: seeds sample data
- db:reset: full reset + reseed

---

## Google OAuth setup

To sign in locally, you need a Google OAuth client.

1. Go to Google Cloud Console
2. Create a project
3. Enable Google Identity / OAuth
4. Create OAuth credentials
5. Add the redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

Then copy the Client ID and Secret into your .env file.

If you are using the app in a different local host or port, add the correct callback URL there as well.

---

## maimai catalog sync

The app can sync song data using the maimai catalog source configured in MAIMAI_CF_BASE_URL.

The sync route is:

- /api/cron/sync

This is typically triggered by cron or manually during local testing. It populates the database with song and sheet records so admins can search and attach tracks.

The route is protected by MAIMAI_CRON_SECRET in production, but in local development it is easier to trigger manually if needed.

---

## Production build

Before deploying or building for production, make sure:

- DATABASE_URL is reachable
- Google OAuth values are valid
- Cloudinary credentials are set
- ADMIN_EMAILS is correct
- better-auth secrets are secure

Then run:

```bash
pnpm build
pnpm start
```

---

## Troubleshooting

### Sign-in flow fails

- Confirm GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are valid.
- Confirm the redirect URI is exactly:

```text
http://localhost:3000/api/auth/callback/google
```

- Confirm your Google email is listed in ADMIN_EMAILS.

### Database connection error

- Check that PostgreSQL is running.
- Check your DATABASE_URL string.
- Ensure the database exists and credentials are correct.

### Admin page is blocked

- Your email must match exactly one of the values in ADMIN_EMAILS.
- Email comparison is case-insensitive in the app, but it still must match the actual Google account email.

### No tracks appear in the tournament builder

- The maimai catalog may not yet be synced.
- Run the catalog sync or add a custom AstroDX/community track.

### Score submission fails

- Confirm the tournament is OPEN.
- Confirm the current time is between registration opens and submission deadline.
- Confirm the screenshot URL is a valid image URL.
- Confirm the achievement value is within the allowed range.

---

## Notes for this project

This app is a lightweight but complete tournament system aimed at community score events. It is intentionally simple and fast rather than broad or over-engineered.

The primary goal is:

- fair tournament management
- transparent score validation
- simple player experience
- admin moderation and leaderboard fairness

---

## License

This project is for local community use unless otherwise specified by the repository owner.

---

## References

- Project plan: PLAN.md
- Prisma schema: prisma/schema.prisma
- Application routes: app/
- Server actions: src/lib/actions/
- Data layer: src/lib/dal/

If you want, I can also create a second version of the README tailored specifically for:

1. GitHub repo presentation
2. deployment on Vercel
3. a Windows-only local setup guide
4. a technical architecture doc with diagrams
