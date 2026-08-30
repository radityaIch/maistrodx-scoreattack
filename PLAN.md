# maistrodx-scoreattack — Implementation Plan (v1)

Locked plan for the maimai score-attack tournament platform. Captures the consensus of the 6-agent design discussion and the user's locked decisions (including the page-builder delta). Treat this as the source of truth — change only by editing this file and updating the milestone log.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.3.3 (App Router) |
| Runtime | React 19.2.8 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind 4 (`@theme inline` tokens, dark-mode-only) |
| ORM | Prisma 6 + `@prisma/client` |
| DB | PostgreSQL (Neon recommended for free tier) |
| Auth | Better Auth (Google provider, DB sessions, `prismaAdapter`) |
| Icons | `lucide-react` (single library) |
| Image host | Cloudinary (free tier, signed uploads via Server Action) |
| Markdown | `react-markdown` + `remark-gfm` |
| Tests | Vitest (3 tests only) |

**Dependencies added — runtime:** `prisma`, `@prisma/client`, `better-auth`, `server-only`, `cloudinary`, `react-markdown`, `remark-gfm`.
**Dependencies added — dev:** `tsx`, `vitest`.
**Explicitly NOT added:** `zod`, `uuid`/`nanoid`, `date-fns`, state libs (zustand/jotai), screenshot SDK, UI component library, `husky`, `prettier`, `playwright`. Reach for these only if a real, measured need appears.

---

## 2. Locked product decisions

| # | Decision | Schema/code impact |
|---|---|---|
| 1 | Score = **achievement% only** (0.00–101.00), 2-decimal precision | `ScoreSubmission.achievementPct Decimal(5,2)` — no `dxScore` column |
| 2 | Scoring rule = admin-chosen **BEST_N** or **AGGREGATE** per tournament | `Tournament.scoringRule` enum; two ranking queries |
| 3 | Admin = **email allowlist** in env (`ADMIN_EMAILS`) | checked in `verifySession()` DAL |
| 4 | Re-submit = **upsert** (one row per player/track, update in place) | `@@unique([playerId, trackId])`; upsert in Server Action |
| 5 | Screenshot = **REQUIRED** on every submission; URL paste | `ScoreSubmission.screenshotUrl String` (NOT NULL); URL paste only (no upload to our storage in v1) |
| 6 | Leaderboard = **public**, no auth required | no route gate; RSC cached |
| 7 | Song jacket image = **community proxy** via `MAIMAI_IMAGE_BASE_URL` env | env var; `next/image` `remotePatterns` configured per deploy |
| 8 | Page builder = **Theme + Markdown** (NOT drag-drop WYSIWYG) | `Tournament.heroImageUrl`, `mascotImageUrl`, `accentColor`, `sectionsOrder`, `rulesetMarkdown` |
| 9 | Asset host = **Cloudinary** | signed upload Server Action; `next/image` `remotePatterns` for `res.cloudinary.com` |

---

## 3. Data model (Prisma 6)

Full `prisma/schema.prisma` lives in the repo; canonical copy below.

```prisma
generator client { provider = "prisma-client-js" }
datasource db    { provider = "postgresql"; url = env("DATABASE_URL") }

// =====================================================
// Better Auth tables (generated; extended below)
// =====================================================

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  emailVerified     Boolean   @default(false)
  name              String?
  image             String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // extensions
  role              UserRole          @default(PLAYER)
  displayName       String?
  maimaiFriendCode  String?

  accounts          Account[]
  sessions          Session[]
  submissions       ScoreSubmission[]
  auditLogs         AuditLog[]        @relation("AuditActor")
  createdTournaments Tournament[]     @relation("TournamentCreator")

  @@index([role])
}

enum UserRole { PLAYER ADMIN }

model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([userId])
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  @@index([userId])
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@index([identifier])
}

// =====================================================
// maimai catalog (synced from CloudFront JSON)
// =====================================================

model Song {
  songId      String   @id          // title string from JSON (yes, this is the key — don't change)
  title       String
  artist      String
  category    String
  bpm         Int?
  imageName   String
  version     String
  releaseDate DateTime?
  isNew       Boolean  @default(false)
  isLocked    Boolean  @default(false)
  raw         Json
  syncedAt    DateTime @default(now())

  sheets      Sheet[]

  @@index([category])
  @@index([version])
}

model Sheet {
  id                 String  @id @default(cuid())
  songId             String
  type               String  // "std" | "dx"
  difficulty         String  // basic | advanced | expert | master | remaster
  level              String
  levelValue         Float
  internalLevel      String?
  internalLevelValue Float?
  noteCounts         Json
  regions            Json
  version            String

  song               Song               @relation(fields: [songId], references: [songId])
  tracks             TournamentTrack[]
  submissions        ScoreSubmission[]

  @@unique([songId, type, difficulty])
  @@index([difficulty])
}

// =====================================================
// Tournament core
// =====================================================

model Tournament {
  id                  String           @id @default(cuid())
  slug                String           @unique
  name                String
  description         String?
  status              TournamentStatus @default(DRAFT)
  registrationOpensAt DateTime
  submissionDeadline  DateTime
  scoringRule         ScoringRule
  bestN               Int?             // required when scoringRule = BEST_N
  maxAchievementPct   Float            @default(101.0)
  maxSubsPerTrack     Int              @default(1)
  requireProof        Boolean          @default(true)

  // === Theme (page builder) ===
  heroImageUrl         String?
  heroImagePublicId    String?
  mascotImageUrl       String?
  mascotImagePublicId  String?
  mascotPosition       String           @default("bottom-right")
  logoOverlayUrl       String?
  logoOverlayPublicId  String?
  accentColor          String?          // hex e.g. "#FF2E88"
  sectionsOrder        String[]         @default(["hero","ruleset","tracks","leaderboard","awards","contestants"])
  rulesetMarkdown      String?          @db.Text

  createdById         String
  createdBy           User             @relation("TournamentCreator", fields: [createdById], references: [id])
  createdAt           DateTime         @default(now())

  tracks              TournamentTrack[]
  submissions         ScoreSubmission[]

  @@index([status, submissionDeadline])
}

enum TournamentStatus { DRAFT OPEN CLOSED FINALIZED }
enum ScoringRule      { BEST_N AGGREGATE }

model TournamentTrack {
  id           String   @id @default(cuid())
  tournamentId String
  sheetId      String
  weight       Decimal  @default(1.0)

  tournament   Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  sheet        Sheet      @relation(fields: [sheetId], references: [id])
  submissions  ScoreSubmission[]

  @@unique([tournamentId, sheetId])
  @@index([tournamentId])
}

// =====================================================
// Player submissions
// =====================================================

model ScoreSubmission {
  id              String           @id @default(cuid())
  tournamentId    String
  trackId         String
  sheetId         String           // denormalized for ranking index
  playerId        String
  achievementPct  Decimal          @db.Decimal(5, 2)
  screenshotUrl   String           // NOT NULL — required per decision #5
  note            String?
  status          SubmissionStatus @default(PENDING)
  submittedAt     DateTime         @default(now())
  decidedAt       DateTime?
  decidedById     String?
  decideReason    String?

  tournament      Tournament       @relation(fields: [tournamentId], references: [id])
  track           TournamentTrack  @relation(fields: [trackId], references: [id])
  sheet           Sheet            @relation(fields: [sheetId], references: [id])
  player          User             @relation(fields: [playerId], references: [id])

  @@unique([playerId, trackId])              // upsert target
  @@index([tournamentId, sheetId, achievementPct(sort: Desc)])
  @@index([playerId, tournamentId])
  @@index([status])
}

enum SubmissionStatus { PENDING VERIFIED REJECTED }

// =====================================================
// Audit trail
// =====================================================

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String
  action     String
  targetType String?
  targetId   String?
  payload    Json?
  createdAt  DateTime @default(now())

  actor      User     @relation("AuditActor", fields: [actorId], references: [id])

  @@index([actorId, createdAt])
  @@index([targetType, targetId])
}
```

**Indexes to know:**
- `(tournamentId, sheetId, achievementPct DESC)` makes leaderboard ranking a single index range scan.
- `@@unique([playerId, trackId])` makes upsert + "one best per (player, track)" a DB constraint.
- `@@unique([songId, type, difficulty])` on Sheet makes sync upserts idempotent.

---

## 4. App Router structure

```
app/
  layout.tsx                          # root: Tailwind, fonts (Geist + Russo One), scanline overlay
  page.tsx                            # landing: active tournaments
  globals.css                         # Tailwind + @theme tokens + arcade CSS

  (auth)/
    sign-in/page.tsx                  # Google OAuth button

  tournaments/
    [slug]/
      page.tsx                        # public tournament page — composed from sectionsOrder
      submit/page.tsx                 # player submit modal page (auth-gated)
      leaderboard/page.tsx            # full leaderboard
      results/page.tsx                # public podium + tie-break disclosure

  me/
    page.tsx                          # my submissions across tournaments

  admin/
    layout.tsx                        # requireAdmin() gate
    page.tsx                          # dashboard (pending moderation count, my tournaments)
    tournaments/
      page.tsx                        # list (draft + published)
      new/page.tsx                    # create form (wizard-style, single page)
      [id]/
        page.tsx                      # edit
        moderate/page.tsx             # moderation queue

  api/
    auth/[...all]/route.ts            # Better Auth handler
    cron/
      sync/route.ts                   # maimai JSON sync (POST, MAIMAI_CRON_SECRET gated)
      close/route.ts                  # auto-close tournaments past deadline

src/
  lib/
    db.ts                             # Prisma singleton (hot-reload safe)
    auth.ts                           # betterAuth() config
    auth-client.ts                    # createAuthClient (browser)
    cloudinary.ts                     # cloudinary v2 config
    storage.ts                        # upload URL builder helpers (1 file)
    sections/
      registry.tsx                    # SECTIONS map; export component switcher
      Hero.tsx, Ruleset.tsx, Tracks.tsx, Leaderboard.tsx, Awards.tsx, Contestants.tsx
    maimai/
      sync.ts                         # 'use cache' fetch + upsert
      types.ts                        # Song/Sheet TS shapes
      image.ts                        # jacket URL builder
    dal/
      session.ts                      # verifySession() + isAdmin() + requireAdmin()
      tournaments.ts                  # listTournaments, getTournament
      submissions.ts                  # submitScore Server Action input checks
      ranking.ts                      # two SQL ranking queries
    actions/
      tournament.ts                   # 'use server' — createTournament, publish, close
      submission.ts                   # 'use server' — submitScore, edit
      moderation.ts                   # 'use server' — approve, reject
      upload.ts                       # 'use server' — Cloudinary signed upload
  generated/prisma/                   # Prisma client output

prisma/
  schema.prisma
  seed.ts                             # tsx prisma/seed.ts — admin user + demo tournament
  migrations/

proxy.ts                              # Next 16 optimistic auth redirect
```

---

## 5. Server Actions vs Route Handlers

| Operation | Mechanism | File |
|---|---|---|
| Tournament CRUD (admin) | **Server Action** | `src/lib/actions/tournament.ts` |
| Score submission (player) | **Server Action** | `src/lib/actions/submission.ts` |
| Moderation (approve/reject) | **Server Action** | `src/lib/actions/moderation.ts` |
| Cloudinary upload | **Server Action** (signed) | `src/lib/actions/upload.ts` |
| Better Auth (OAuth callbacks) | **Route Handler** | `app/api/auth/[...all]/route.ts` |
| maimai sync (cron) | **Route Handler POST** | `app/api/cron/sync/route.ts` |
| Auto-close tournaments (cron) | **Route Handler POST** | `app/api/cron/close/route.ts` |

**Rule:** mutations → Server Actions (form-driven, RSC-friendly). External/cron → Route Handlers. S3-style binary uploads → Route Handlers (avoid 1 MB Server Action body cap), but our v1 is URL-paste only.

---

## 6. Auth & admin gating

- **Better Auth instance** in `src/lib/auth.ts`: `prismaAdapter(prisma, { provider: 'postgresql' })`, `socialProviders.google`, `nextCookies()` plugin **last**.
- **DB sessions** (default) — one query per page read, revocable, no JWT gymnastics.
- **Proxy (`proxy.ts`)** = optimistic redirect for unauthenticated users hitting `/me`, `/admin`, `/tournaments/*/submit`. NOT a security boundary.
- **DAL `verifySession()`** = ground truth. `cache`-wrapped so one call per request. Calls `auth.api.getSession({ headers: await headers() })`.
- **Admin gating**: `ADMIN_EMAILS` env (comma-separated). `isAdmin(session)` and `requireAdmin()` helpers in `src/lib/dal/session.ts`. `requireAdmin()` is called inside every admin Server Action; UI gates are decorative.
- **Env (server-only):** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (multi-instance).

---

## 7. maimai data sync

- **Source:** `https://dp4p6x0xfi5o9.cloudfront.net/maimai/data.json` (~230k lines).
- **Trigger:** Vercel Cron every 6h → `POST /api/cron/sync` with `MAIMAI_CRON_SECRET` header.
- **Cache:** wrapped in `'use cache'` + `cacheLife('days')` + `cacheTag('maimai:songs')`. Sync route calls `updateTag('maimai:songs')` after upsert (read-your-writes).
- **Upsert strategy:** `Song` keyed on `songId`; `Sheet` keyed on `(songId, type, difficulty)`. New `imageName` → update in place. Removed sheet → orphan (don't cascade-delete; preserves tournament history).
- **Image URLs:** `${MAIMAI_IMAGE_BASE_URL}/${imageName}` built at render time. Env var controls the proxy URL so we can flip without redeploy.

---

## 8. Anti-fraud & scoring rules

### 8a. Submission Server Action (`submitScore`) — enforced in this order

1. **Auth:** `verifySession()` (throws redirect if anonymous).
2. **Shape:** `achievementPct` is a number in `[0, 101]`; `screenshotUrl` is a valid image URL (regex `^https?://.*\.(png|jpe?g|webp|gif)(\?.*)?$`).
3. **Track in tournament:** `TournamentTrack` exists; `tournament.status === 'OPEN'`; `now ∈ [registrationOpensAt, submissionDeadline]`.
4. **Achievement cap:** `achievementPct ≤ tournament.maxAchievementPct` (default 101.0).
5. **Rate limit:** ≤ 10 submissions per user per rolling hour (DB count, simple).
6. **Upsert:** `@@unique([playerId, trackId])` enforces one row per (player, track). Update overwrites `achievementPct`, `screenshotUrl`, resets `status=PENDING`, clears `decideReason`.
7. **Cache invalidation:** `updateTag('tournament:<id>')` so leaderboard re-renders.

### 8b. Ranking queries

**AGGREGATE** (default): sum achievement% across all tournament tracks per player.

```sql
WITH best AS (
  SELECT DISTINCT ON (s."playerId", s."trackId")
         s."playerId", s."achievementPct", s."submittedAt"
    FROM "ScoreSubmission" s JOIN "TournamentTrack" t ON t.id = s."trackId"
   WHERE t."tournamentId" = $1 AND s.status = 'VERIFIED'
   ORDER BY s."playerId", s."trackId", s."achievementPct" DESC
),
totals AS (
  SELECT "playerId",
         SUM("achievementPct")::numeric AS totalPct,
         COUNT(*)                       AS tracks,
         MIN("submittedAt")             AS firstSub
    FROM best GROUP BY "playerId"
)
SELECT * FROM totals
 ORDER BY totalPct DESC, tracks DESC, firstSub ASC LIMIT 3;
```

**BEST_N**: same `best` CTE, then `ROW_NUMBER()` partition, filter `rn <= bestN`, sum.

**Tie-break order (both):** totalPct → tracks → earliest first submission. Final two-way ties shown as shared rank; admin resolves if needed.

### 8c. Moderation

- `status = 'PENDING'` rows visible only on `/admin/tournaments/[id]/moderate`.
- Leaderboard counts `status = 'VERIFIED'` only. PENDING never appears publicly.
- Approve: `status='VERIFIED'`, `decidedAt`, `decidedById`, AuditLog row.
- Reject: `status='REJECTED'`, `decideReason` required, AuditLog row. Row stays for audit.

---

## 9. Theme builder (delta — added post-initial-lock)

### 9a. Schema additions to `Tournament`

| Field | Purpose |
|---|---|
| `heroImageUrl` + `heroImagePublicId` | Full-bleed banner (Cloudinary secure_url) |
| `mascotImageUrl` + `mascotImagePublicId` | Floating decorative image (AWMC's `miyo.png`) |
| `mascotPosition` | `bottom-right` (default) / `bottom-left` / `top-right` / `top-left` |
| `logoOverlayUrl` + `logoOverlayPublicId` | Optional logo layered on hero |
| `accentColor` | Hex (`#FF2E88`); overrides theme default |
| `sectionsOrder` | `String[]` ordered; subset of `hero, ruleset, tracks, leaderboard, awards, contestants` |
| `rulesetMarkdown` | `Text` — admin-authored markdown for "Ruleset" section |

### 9b. Section registry (RSC, zero client JS)

```ts
// src/lib/sections/registry.tsx
const SECTIONS = {
  hero:        HeroSection,
  ruleset:     RulesetSection,
  tracks:      TracksSection,
  leaderboard: LeaderboardSection,
  awards:      AwardsSection,
  contestants: ContestantsSection,
} as const
```

`tournaments/[slug]/page.tsx` iterates `tournament.sectionsOrder`, renders each section in turn. **No drag-drop** — admin form has ↑/↓ buttons per section. **No live iframe preview** — form save → RSC re-renders → fast enough on local.

### 9c. Cloudinary wiring

- Free-tier account → Cloud Name, API Key, API Secret.
- Server-side signed upload via Server Action `uploadTournamentAsset(slot, file)` (slot = `hero|mascot|logo`).
- 5 MB cap; `image/(png|jpe?g|webp|svg+xml)` only.
- `next.config.ts` → `images.remotePatterns: ['res.cloudinary.com']`.

### 9d. Admin tournament form (`/admin/tournaments/new` and `[id]`)

Single page (not a wizard), collapsible sections:

1. **Basics** — name, slug, description, deadline, scoring rule + bestN, max achievement%.
2. **Tracks** — multi-select from synced song DB (`TrackPicker`).
3. **Theme** (the builder):
   - 5 image uploaders (hero, mascot, logo) → each shows preview.
   - mascotPosition selector.
   - accentColor (`<input type="color">` + hex text).
   - rulesetMarkdown textarea + live preview pane (same `react-markdown`).
   - sectionsOrder: 6 rows with ↑/↓ buttons + on/off toggle.
4. **Publish** — save draft / publish.

Save → Server Action → `prisma.tournament.update` → `updateTag('tournament:<id>')` → public page re-renders.

---

## 10. Env vars (`.env.example` to commit)

```dotenv
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maistrodx?schema=public"

# Better Auth
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET=""                                  # openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Admin gating
ADMIN_EMAILS=""                                        # comma-separated, e.g. alice@x.com,bob@y.com

# maimai data
MAIMAI_CF_BASE_URL="https://dp4p6x0xfi5o9.cloudfront.net/maimai"
MAIMAI_IMAGE_BASE_URL=""                               # community proxy w/ trailing /
MAIMAI_CRON_SECRET=""                                  # random, protects /api/cron/*

# Cloudinary
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Multi-instance deploys (optional)
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=""                  # base64 AES-256
```

---

## 11. Milestones (5)

| M | Acceptance (must pass to advance) |
|---|---|
| **M1 — Identity & shell** | Unauth user lands on `/`; Google sign-in works; signed-in user lands on `/me` showing name, email, empty state; `ADMIN_EMAILS` allowlist gates `/admin/*`; sign-out works. `prisma migrate dev` runs clean. |
| **M2 — Catalog & admin tournament CRUD** | `POST /api/cron/sync` populates ≥1 Song+Sheet from CloudFront JSON. Admin at `/admin/tournaments/new` searches "Paradisus", picks `dx master` sheet, sets deadline, scoring rule, bestN (if applicable), and theme (hero image, mascot, accent color, ruleset markdown, sections order). Saved tournament visible at `/admin/tournaments`. |
| **M3 — Player loop** | Logged-in player at `/t/<slug>` sees tracks, deadline, leaderboard (empty). Submit modal accepts achievement% + screenshot URL; creates `ScoreSubmission PENDING`; appears on leaderboard after admin verifies. Late submit (after deadline) rejected with error. Upsert replaces previous score on same (player, track). |
| **M4 — Moderation + close + winners** | Admin moderation queue lists pending submissions; approve → `VERIFIED` → leaderboard; reject → reason recorded. `POST /api/cron/close` flips status past-deadline tournaments to CLOSED + FINALIZED. `/t/<slug>/results` publicly shows top-3 podium with rule + tie-break disclosure. |
| **M5 — Public tournament page v1** | Public `/t/<slug>` renders sections in admin-chosen order using the theme; Cloudinary images served via `next/image`; mobile-responsive; cached RSC; respects `sectionsOrder`. |

---

## 12. WBS (ordered, with size + deps)

| # | Item | Size | Depends on |
|---|---|---|---|
| W1 | Add deps (prisma, better-auth, server-only, cloudinary, react-markdown, remark-gfm, tsx, vitest) | S | — |
| W2 | DB schema + first migration | S | W1 |
| W3 | Better Auth setup + Google provider + `proxy.ts` + `verifySession()` + admin allowlist | M | W1, W2 |
| W4 | App shell (layout, fonts, scanline, nav, empty dashboard, sign-in page) | S | W3 |
| W5 | maimai JSON sync (`'use cache'` + cron route) | L | W1, W2 |
| W6 | Track picker UI (search maimai DB, multi-select) | M | W4, W5 |
| W7 | Admin tournament CRUD (form + Server Actions) | M | W4, W6 |
| W8 | Cloudinary SDK + `uploadTournamentAsset` Server Action + `<CloudinaryUploader>` | S | W1 |
| W9 | Theme fields on admin tournament form + live preview | M | W7, W8 |
| W10 | Section registry + 6 section components + public `/t/[slug]` composer | M | W7 |
| W11 | Player submission modal + Server Action + screenshot URL validation | M | W4 |
| W12 | Leaderboard query (AGGREGATE) + `LeaderboardSection` rendering | S | W5, W11 |
| W13 | Leaderboard query (BEST_N) + admin scoring rule switch | S | W12 |
| W14 | Moderation queue (admin) + approve/reject Server Actions + AuditLog | M | W11 |
| W15 | `/api/cron/close` + manual close button + `/t/[slug]/results` podium | M | W13, W14 |
| W16 | 3 Vitest tests (ranking × 2 rules, deadline, score rule) | S | W13, W11 |
| W17 | Deploy (Vercel + Neon + Vercel Cron + env vars) | S | all |

**Critical path:** W1 → W2 → W3 → W4 → W5 → W6 → W7 → W9 → W10 (M2/M5) and W11 → W12 → W13 → W14 → W15 (M3/M4).

---

## 13. Effort estimate

| Block | Days (solo dev) |
|---|---|
| M1 (Identity & shell) | 3–5 |
| M2 (Catalog & admin CRUD + theme) | 5–8 (theme fields add ~1) |
| M3 (Player loop) | 2–3 |
| M4 (Moderation + close + winners) | 2–4 |
| M5 (Public tournament page v1) | 2–3 |
| Tests (W16) | 0.5–1 |
| Deploy (W17) | 0.5–1 |
| **Total** | **15–25** |
| + 30% buffer | **20–32 working days solo** |

---

## 14. Out of scope (v2+) — DO NOT add unless asked

- Drag-drop section reordering (up/down buttons only in v1)
- Live iframe preview in admin form (RSC re-render on save is fast enough)
- Markdown WYSIWYG editor (textarea only)
- Per-section background images / parallax
- Custom CSS overrides per tournament
- Multiple pages per tournament (one `/t/[slug]` only)
- Discord bot sync, multi-game (CHUNITHM/ONGEKI), regional leaderboards, prize integration
- i18n (EN only; song titles remain CJK with `lang="ja"`)
- Real-time websockets (10s polling on leaderboard)
- Screenshot OCR, image-based anti-cheat
- Dispute UI, audit-export
- Mobile-native app
- Self-hosted asset storage (Cloudinary only in v1)
- Cache Components global flag (`cacheComponents: true`) — turned on later only if needed
- Custom hook layer, DTO wrappers, state-machine library, plugin system for storage providers
