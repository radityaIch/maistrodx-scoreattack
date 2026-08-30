# maistrodx score attack

Community-run maimai score-attack tournament platform.

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind 4 · Prisma 6 · PostgreSQL · Better Auth · Cloudinary
- **Spec:** see [`PLAN.md`](./PLAN.md) (locked design + milestones)
- **Implementation status:** all 5 milestones scaffolded. M1–M5 code in place; final integration requires real `.env` + DB to fully exercise.

---

## Quick start

```bash
# 1. Install deps
pnpm install

# 2. Configure env
cp .env.example .env
# fill in DATABASE_URL, BETTER_AUTH_SECRET (openssl rand -base64 32),
# GOOGLE_CLIENT_ID/SECRET, ADMIN_EMAILS, MAIMAI_IMAGE_BASE_URL, etc.

# 3. Generate Prisma client + run first migration
pnpm db:generate
pnpm db:migrate --name init

# 4. Seed demo data
pnpm db:seed

# 5. Dev server
pnpm dev
```

Open <http://localhost:3000> → sign in with Google (your email must be in `ADMIN_EMAILS`) → `/admin/tournaments/new`.

---

## Scripts

| Command | What |
|---|---|
| `pnpm dev` | Next dev server |
| `pnpm build` | Production build (requires reachable `DATABASE_URL`) |
| `pnpm start` | Run the built app |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript no-emit check |
| `pnpm test` | Vitest unit tests (3 files / 8 tests) |
| `pnpm db:generate` | Regenerate Prisma client |
| `pnpm db:migrate` | Run migrations (dev) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:seed` | Seed admin + demo tournament |
| `pnpm db:reset` | Reset + reseed (destroys data) |

---

## Architecture (high-level)

| Concern | Where |
|---|---|
| Routing | `app/` (App Router) |
| Server Actions | `src/lib/actions/*` (`'use server'`) |
| DAL + auth | `src/lib/dal/*` + `src/lib/auth.ts` |
| DB client | `src/lib/db.ts` (Prisma singleton) |
| maimai sync | `src/lib/maimai/sync.ts` + `app/api/cron/sync/route.ts` |
| Section composer | `src/lib/sections/registry.tsx` + 6 components |
| Tests | `src/__tests__/` |
| Schema | `prisma/schema.prisma` |

### Why Next.js 16 + cacheComponents?

The plan uses `'use cache'` + `cacheTag('tournament:<id>')` for read-your-writes invalidation across Server Actions. cacheComponents (Next 16's stable name for the new caching model) is required for those directives.

Conventions:
- All `cookies()` / `headers()` / `params` reads are wrapped in `<Suspense>` so the page shell can prerender statically.
- Pages with `'use cache'` DAL reads return tagged data; mutations `updateTag(...)` to invalidate.
- `proxy.ts` (was `middleware.ts` in Next ≤15) is an *optimistic* redirect for `/me`, `/admin`; the DAL `requireAdmin()` is the real gate.

### Auth + admin gating

- **Better Auth** with Google social provider, DB sessions (`prismaAdapter`).
- **Admin** is gated by `ADMIN_EMAILS` (comma-separated env) — checked in `verifySession()` on every request.
- All Server Actions call `requireSession()` / `requireAdmin()` first; UI gates are decorative.

### Data model (Prisma)

See [`prisma/schema.prisma`](./prisma/schema.prisma). Key shapes:

- `Tournament` — slug, status (`DRAFT/OPEN/CLOSED/FINALIZED`), scoring rule (`AGGREGATE` or `BEST_N`), max achievement %, theme fields.
- `TournamentTrack` — pivot to `Sheet` (one tournament ↔ many sheets).
- `ScoreSubmission` — `(playerId, trackId)` unique → upsert target. `achievementPct Decimal(5,2)`, `screenshotUrl` NOT NULL, `status PENDING/VERIFIED/REJECTED`.
- `AuditLog` — every mutation logs `(actorId, action, targetType, targetId, payload)`.

### Ranking (PLAN §8b)

- **AGGREGATE** — sum every track best per player.
- **BEST_N** — sum top N per player (ROW_NUMBER partition).
- **Tie-break** — total % DESC → tracks DESC → earliest submission ASC. Two-way ties shown as shared rank.

Both queries use the `@@index([tournamentId, sheetId, achievementPct DESC])` index for a single index range scan.

### Submission Server Action (`submitScoreAction`, PLAN §8a)

Order of checks:
1. `requireSession()`
2. shape (`achievementPct ∈ [0, 101]`, `screenshotUrl` image URL)
3. track in tournament, status OPEN, now in `[registrationOpensAt, submissionDeadline]`
4. `achievementPct ≤ tournament.maxAchievementPct`
5. rate limit ≤ 10 / rolling hour per player
6. `prisma.scoreSubmission.upsert({ where: { playerId_trackId } })`
7. `updateTag(...)` to invalidate caches + `prisma.auditLog.create(...)`

---

## Deploying

### Vercel + Neon (recommended for free tier)

1. Create a Neon Postgres project → copy the connection string to Vercel env as `DATABASE_URL`.
2. Create a Google OAuth client (https://console.cloud.google.com) → set Authorized redirect URI to `https://<your-domain>/api/auth/callback/google`. Copy `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` into Vercel env.
3. Create a Cloudinary account → copy `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
4. Set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (same), and `ADMIN_EMAILS` (your email).
5. Set `MAIMAI_IMAGE_BASE_URL` + `NEXT_PUBLIC_MAIMAI_IMAGE_BASE_URL` to your community proxy.
6. Add Vercel Cron entries:
   - `POST /api/cron/sync` every 6h with header `x-cron-secret: $MAIMAI_CRON_SECRET`
   - `POST /api/cron/close` every hour with the same secret

### First-run checklist

- [ ] `pnpm db:migrate --name init` runs clean against Neon
- [ ] `pnpm db:seed` produces the demo tournament
- [ ] Sign in with Google (your email in `ADMIN_EMAILS`)
- [ ] `/admin/tournaments/new` loads
- [ ] Running `POST /api/cron/sync` with the secret populates the catalog
- [ ] Create a real tournament + submit a score + verify in `/admin/tournaments/[id]/moderate`

---

## Things deliberately out of scope (PLAN §14)

- Drag-drop section reordering (↑/↓ buttons only)
- Live iframe preview (RSC re-render is fast enough)
- Markdown WYSIWYG (textarea + live preview pane)
- Per-section backgrounds, custom CSS, multiple pages per tournament
- Real-time websockets, OCR / anti-cheat, dispute UI, mobile-native, i18n
- Discord bot, multi-game (CHUNITHM/ONGEKI), prize integration

---

## Testing

```bash
pnpm test
```

3 test files (Vitest, mocks `server-only` + Prisma):

- `ranking.test.ts` — AGGREGATE ordering, empty result, tie-break contract.
- `deadline.test.ts` — `submitScoreAction` rejects past-deadline + non-OPEN.
- `scoreRule.test.ts` — `createTournamentAction` validates `BEST_N` requires `bestN`, rejects out-of-range.

Integration / e2e tests are out of scope (no DB or browser in the unit test suite). The build does include a TS + lint pass.
