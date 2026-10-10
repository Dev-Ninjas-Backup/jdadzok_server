# jdadzok_server (Synqulan Server)

## Project concept
NestJS + Prisma (PostgreSQL) backend for the Synqulan / jdadzok social platform: reputation-based
Cap ladder (Green, Yellow, Red, Black, plus invitation-only Sky Blue), volunteering and mentorship
hours, ad-revenue sharing, marketplace/Stripe payouts, search, chat/calls. Client: John (jdadzok).
Product principle from the client: **reputation, not popularity** (endorsements and verified
contribution, not follower counts).

## Tech stack and layout
- NestJS feature modules under `src/main/` (folders in parentheses are groups, e.g. `(core)`, `(abuse)`,
  `(users)`), admin under `src/(admin)`, shared code in `src/common` and `src/lib`.
- Prisma schema split into files in `prisma/schema/`; migrations in `prisma/migrations/`.
- Queues: BullMQ + Redis. Vendors (search, fraud, email, bot, moderation) use a provider interface +
  factory with `off | memory | vendor` and an `ABUSE_*` / `SEARCH_*` feature flag, default off.
- Tests are `tsx` self-test scripts (no Jest): see `package.json` `test:*` scripts.

## Current state (2026-10-10)
**Merged to main:** #42 withdraw guards (PR #50), #43 disputable hours (PR #51), #25 abuse P0 adapters
(PR #52), client item 6 ad opt-in (PR #53), client item 7 time windows (PR #54), client item 2 impact
score (PR #55).
**Open PR, waiting for user review/merge:** PR #56 `feat/submission-rate-limit` (client item 7 rate
limiting). With it, all four engineering items from John's 2026-10-07 message are built.
**Next:** nothing is queued. Waiting on John's final numbers (see below) and on client vendor keys.
**GitHub issues still open:** #25 (abuse P0, code merged, waits for client keys and joint test) and
#29 (client vendor decisions, summary comment posted). Both are blocked on the client.

### Client (John) feedback of 2026-10-07 and where each item stands
1. Numbers configurable: waiting for his final figures (thresholds, points, 320 h). Everything is DB config.
2. Scoring: DONE in PR #55 (not merged yet).
3. Black=200 and Red=100: NOT built, waiting for his numbers (seed in `cap-requirements.seed.service.ts`).
4. Sky Blue: leave as built (Red rate until Black hours, then top rate). Nothing to do.
5. Percentage table, Black ceiling ~70%: NOT built, waiting for numbers; percentages must stay backend-only.
6. Ad opt-in: DONE (PR #53). `users.adRevenueOptIn`, off by default for everyone, gates all 3 money paths.
7. Time windows: DONE (PR #54). Rate limiting: DONE in PR #56 (not merged yet).

### How the scoring works now (PR #55)
`score = min(popularity, popularityCap) + distinct endorsers x endorsement weight x endorser level
multiplier + verified hours x weight`. Weights live only in the `activity-score` table (admin
`POST /settings`, now admin-only); code defaults apply when no row exists. Placeholder defaults:
post 1, comment 0.5, share 0.5, like 0, follower 0, popularityCap 30, endorsement 10, levelBonus
0.5, verifiedHour 2. Anti-gaming: one count per endorser, no self or no-level endorsers, returned
endorsements ignored, moderation-held posts earn nothing. Stored score refreshes on status check,
eligibility check and the monthly job (not instantly on a new endorsement).

### Rate limiting (PR #56)
`RateLimitGuard` + `@RateLimit("POST"|"COMMENT"|"ENDORSEMENT"|"HOUR_LOG")` after `JwtAuthGuard`, per member,
fixed-window Redis counters via `RedisService.checkRateLimit`. Placeholders: posts 20/h, comments 60/h,
endorsements 10/day, hour logs 20/day; env `RATE_LIMIT_<RULE>_MAX` / `_WINDOW_SECONDS`, `RATE_LIMIT_ENABLED`,
`RATE_LIMIT_FAIL_CLOSED` (default fail open). To protect a route add a name in `rate-limit.util.ts`.
Not covered: volunteer apply, likes, shares, chat. Never tested against a real Redis.

## Key decisions
- Work in this folder on feature branches off `origin/main`; one logical change per PR/commit.
- Vendor features ship feature-flagged and default off, so merging changes nothing until keys exist.
- Admin overrides with a recorded reason may bypass level gates; downgrades are never blocked.
- `profile.balance` is lifetime earnings and is never debited on payout; available withdraw amount =
  balance minus PENDING/PROCESSING/SUCCESS withdraws (PR #50).
- Register abuse checks run for every `authProvider` (client-supplied) and before the controller try/catch.

## Open concerns (raise with the user / client, not yet changed)
- `src/main/(core)/user-metrics/` is NOT mounted anywhere (dead code: unguarded score-write routes,
  fake `config/weights`) yet the cap-level README presents it as live. Suggest deleting it; never mount it.
- `SocketAuthGuard` is the only APP_GUARD and returns 500 for HTTP in a bare test harness, so it is
  unclear what protects HTTP routes without decorators. Always add `@ValidateAdmin()` explicitly. Check
  prod logs for unexpected `POST /settings` calls from before PR #55.
- `GET /cap-level/status/me` returns exact share percentages (`privateEarnings`), but John says exact
  percentages must never appear in the UI.
- Monthly ad revenue has a +50% bonus from activity score (`AdRevenueService`), another popularity driver.
- Hard-coded 2/3/4/5% per level in `HelperService` and `StripeService` give Sky Blue 0%.
- Dead code: `CapLevelService.getUsersEligibleForPromotion` (no callers, ignores the time window).
- Client must confirm how Turnstile runs in the mobile app; the app must send `captchaToken` on
  `/users/register` once `ABUSE_BOT_PROVIDER` is enabled. Only posts are moderated so far.

## Security incident (2026-10-10)
Fake "auth" loader malware was found staged, never committed: `eval()` of a remote script from a
base64 `AUTH_API_KEY` env var in `src/main.ts`, `node api.js &&` before npm `start/build/dev`, obfuscated
`api.js` and `public/fonts/fa-solid-700.fml`, a `.vscode/tasks.json` task running it on `folderOpen`,
and a staged `.env`. All removed (copies in `~/quarantine/jdadzok_server-20261010/`, outside the repo).
Re-scan clean on 2026-10-10 (no `api.js`, `.vscode`, `public/fonts`, loader keys). If those scripts ran
on this machine, rotate reachable secrets. Never restore or run those files.

## Conventions and gotchas
- Never commit or push unless the user asks; no `Co-Authored-By` or AI attribution in commits or PRs
  (user's global rule overrides tool defaults). Conventional commit subjects. The user reviews and merges PRs.
- `UserController.register` returns errors as HTTP 200 bodies (`catch (err) { return err; }`).
- `tsx` does not emit decorator metadata, so it cannot check class-typed DI. Use
  `NODE_OPTIONS=--no-experimental-strip-types node -r ts-node/register/transpile-only -r tsconfig-paths/register file.ts`.
- `.env.example`, `users.prisma`, `cap-requirements.prisma`, `activityScore.prisma` use CRLF: edit bytewise.
- Prettier cannot match paths with parentheses via globs; pass explicit file lists.
- Migrations: generate with `prisma migrate diff --from-schema-datamodel <old> --to-schema-datamodel
  prisma/schema --script`, write a new folder, never edit applied ones, never apply to prod without the user.
- The only leftover worktree is `../jdadzok_server-wt` (merged abuse branch). Its
  `.github/workflows/cd.yaml` holds an uncommitted comment cleanup made by the user; leave it.

## Setup and run
- Tests (each prints PASS/FAIL): `npm run test:rate-limit | test:impact-score | test:cap-window | test:ad-optin |
  test:abuse-email | test:abuse-bot | test:abuse-moderation | test:withdraw | test:volunteer | test:fraud`.
- Typecheck `npx tsc --noEmit -p tsconfig.json`; lint `npx eslint <files>`; format `npx prettier --check <files>`.
- Prisma client: `npx prisma generate`. Other scripts (`dev`, `build`, `start:prod`, `db:seed`) are in `package.json`.
- Not verified from this environment: booting the full app (needs Postgres and Redis) and real vendor calls.

## Last updated
2026-10-10: PR #55 merged; PR #56 (rate limiting) opened. Waiting on user review of #56 and on the client's numbers.
