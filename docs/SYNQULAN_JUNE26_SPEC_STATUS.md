# Synqulan — June 26 Spec vs Backend Status

Living checklist of what **To Borhan – June 26** asks for, mapped to the current NestJS / Prisma backend (`jdadzok_server`).

| Field | Value |
| --- | --- |
| **Codebase** | `jdadzok_server` · display name Synqulan Server · **v1.6.0** |
| **Last updated** | 2026-08-23 |
| **Purpose** | Single source of truth for implemented / partial / missing work before shipping gaps one by one |

## Sources

- `To Borhan - June 26/Synqulan-Developer-Requirements.docx` (esp. §§3–8)
- `To Borhan - June 26/Synqulan-Concept-and-Design.docx`
- `To Borhan - June 26/prototype.html`
- `To Borhan - June 26/synqulan-individual (1).html` · `synqulan-business.html`
- `To Borhan - June 26/synqulan-audit.html` (row claims verified against code; **summary strip in that HTML is wrong** — see counts below)
- Code: `prisma/schema/*`, `src/main/*`

---

## Legend

| Mark | Meaning |
| --- | --- |
| `[x]` | **Implemented** — matches the brief well enough to use |
| `[~]` | **Partial / mismatch** — exists but incomplete or wrong shape |
| `[ ]` | **Missing** — not in schema / API yet |

When a feature ships: flip `[ ]` or `[~]` → `[x]`, and add a line under [Changelog](#changelog).

---

## Summary counts (corrected)

Among the **36** product-feature rows below (Cap through Profile/guest):

| Status | Count |
| --- | --- |
| Implemented `[x]` | **19** |
| Partial / mismatch `[~]` | **9** (7 partial + 2 mismatch) |
| Missing `[ ]` | **8** |

> The audit HTML header (`14 / 11 / 13 / 3`) does **not** match its own tables. Prefer this document.

Marketing landing pages are static HTML in the June 26 folder (not served by this API). Backend public CMS endpoints (about / terms / privacy) exist separately.

---

## 1. Cap System & ladder

| Status | Feature | Spec requirement | Current backend state |
| --- | --- | --- | --- |
| `[x]` | Five-level ladder | Green → Yellow → Red → Black → Sky Blue, stored per user with progression rules | `CapLevel` enum + `User.capLevel`, `CapRequirements`, cron promotion under `src/main/(core)/cap-level/` |
| `[x]` | Top-tier rename (Sky Blue) | Top cap is **Sky Blue**, not “black with ostrich feather” | `CapLevel.SKY_BLUE` (renamed from `OSTRICH_FEATHER`); parallel invitation track |
| `[x]` | Green → Yellow → Red (score-driven) | Lower rungs driven by Impact / Activity score | `ActivityScore` + cap cron / processor auto-promote when `requiresVerification` is false |
| `[~]` | Red → Black: hours + admin gate | Must be Red, meet verified-hours threshold, admin review | `CapRequirements.requiresVerification` + `PUT /cap-level/promote/:userId`; order-of-ops (Red first) not fully locked in promotion logic |
| `[x]` | Sky Blue: invitation-only, dual verification | Never applied for; KYC + notability; committee + audit trail; earns at Red rate until Black-level volunteering | `SkyBlueNomination` + events; `/cap-level/sky-blue/*`; ad-share uses Red rate until Black `minVolunteerHours` |
| `[~]` | Revenue % hidden, configurable | Exact ad-share % never hard-coded in UI copy — business data | `CapRequirements.adSharePercentage` is DB-backed (good); module README still documents fixed 2/10/20/45/60% figures |
| `[ ]` | Illustrated cap: style & placement | Profile setting: style (structured / soft) and placement (worn / beside; default beside) | No fields on `Profile` or `User` |

**Key paths:** `prisma/schema/enum.prisma`, `prisma/schema/cap-requirements.prisma`, `src/main/(core)/cap-level/`

---

## 2. Volunteering & mentor opt-in

| Status | Feature | Spec requirement | Current backend state |
| --- | --- | --- | --- |
| `[x]` | Volunteer / mentor opt-in flag | Boolean from onboarding; toggleable; gates mentoring tools **independent of Cap** | `Profile.isVolunteerMentorOptIn`; set via `POST /choices` (onboarding) or `PATCH /user-profile` / `PATCH /user-profile/volunteer-mentor-opt-in`; gates volunteer apply + hour logging |
| `[x]` | Opportunities / projects | NGO-listed placements; apply / accept / reject; hours count | `VolunteerProject` + `VolunteerApplication` in `src/main/volunteer/` |
| `[~]` | Hours bank & carry forward | Hours persist across Caps; Black = Red + threshold + review | Hours logged per application (cap 352/project) into `workedHours`; lifetime Black threshold only partially in cap cron |
| `[x]` | Contribution types + “Other” | Mentoring, advice, project, teaching, charity + free-text Other (pattern app-wide) | `ContributionType` on `VolunteerHour` + Bridge listings; Other free-text via `resolveOtherText`; interests `Other` choice + `Profile.interestOtherText`; Bridge discover filters |

**Key paths:** `prisma/schema/volunteer-*.prisma`, `src/main/volunteer/volunteer.service.ts`, `prisma/schema/profile.prisma`

---

## 3. Verifying a volunteer hour

| Status | Feature | Spec requirement | Current backend state |
| --- | --- | --- | --- |
| `[x]` | In-platform mentorship call (highest trust) | Verified call in-app; duration auto-logs as verified hours | `Calling.callPurpose=MENTORSHIP`; on `END` with `startedAt`, auto-creates verified `VolunteerHour` linked to call (+ ACCEPTED application when found) |
| `[x]` | Partner-verified (NGO) | Vetted partner confirms; hours auto-count | Hours require `ACCEPTED` application; NGO owner confirms via `updateStatus()` |
| `[ ]` | Counterparty confirmation | Mentee / recipient confirms mentoring session | No mentee-side confirm path |
| `[x]` | Self-reported + endorsement gate | Self-logged hours pending until higher-Cap / admin endorsement | Self-report → `VolunteerHourVerificationStatus.PENDING`; `PATCH /volunteer/hours/:id/endorse` by higher-Cap or admin credits Cap metrics; auto NGO endorsement removed |
| `[~]` | Admin review at Black threshold | Admin review before highest revenue share | `requiresVerification` + manual promote; enforcement vs bypass needs hardening |

**Key paths:** `prisma/schema/calling.prisma`, `prisma/schema/volunteer-hour.prisma`, `prisma/schema/endorsement.prisma`, `src/main/(shared)/calling/`

---

## 4. Follow, Connect, chats & calls

| Status | Feature | Spec requirement | Current backend state |
| --- | --- | --- | --- |
| `[~]` | Follow (one-way) | Subscribe to updates; feeds audience / ads; no consent | **Mismatch:** both `Follow` and `UserFollow` exist and are used |
| `[x]` | Connect (mutual) | Request both accept; gate for private messaging and general calls | `FriendRequest` ACCEPTED enforced server-side on private chat + `callPurpose=GENERAL` calls |
| `[x]` | Messaging gated by mutual Connect | Must be enforced **server-side** | `FriendRequestService.assertConnected` on private chat create/send (HTTP + socket) |
| `[ ]` | General vs Mentorship chat | Two distinct inbox contexts; mentorship thread auto-opens on accept | `LiveChatType` = `INDIVIDUAL` / `GROUP` only |
| `[x]` | Verified session call vs General call | Opposite screens/records; one logs to Cap, one never | `CallPurpose` `GENERAL` \| `MENTORSHIP` on `Calling`; only mentorship ends auto-log verified hours |

**Key paths:** `prisma/schema/follow.prisma`, `prisma/schema/users.follow.prisma`, `prisma/schema/friend.request.prisma`, `prisma/schema/livechat.prisma`, `src/main/(sockets)/chats/`, `src/main/(users)/friend-request/`

---

## 5. Monetisation pillars

| Status | Feature | Spec requirement | Current backend state |
| --- | --- | --- | --- |
| `[x]` | Advertising revenue-share | Advertisers → member share by Cap | `AdRevenueShare`, monthly calc, payout / withdraw / Stripe rails |
| `[ ]` | Recruitment / talent-sourcing | Employers pay for reputation-ranked candidates | No employer talent-search models |
| `[~]` | Corporate / CSR subscriptions | Orgs pay; tiers + impact reporting | `CorporateMembership` exists with **Silver / Gold / Platinum** (spec landings: Starter / Growth / Enterprise); tracks ad/sponsorship usage, not SDG / ESG reports |
| `[ ]` | Training & course marketplace | Course buyers; cohorts / completion | `Product` is generic goods (stock, price, digital URLs) — no course concept |
| `[ ]` | Sponsored opportunities & projects | Orgs sponsor Bridge / volunteer opportunities | `DedicatedAd` ties `Product` ↔ `Post`, not `VolunteerProject` |
| `[ ]` | Bridge gig transaction fee | Cut of money flowing to gig workers | Depends on Bridge (missing) |
| `[ ]` | Anonymised impact-data insights | Sell aggregations to NGOs / agencies | No anonymisation / export layer |

**Key paths:** `src/main/(core)/ad-revenue/`, `prisma/schema/corporate-membership.prisma`, `prisma/schema/dedicatedAd.prisma`, `src/main/(marketplace)/`

---

## 6. The Bridge vs today’s Marketplace

> Spec deliberately avoids naming this “marketplace.” Current `(marketplace)` is a **goods** buy/sell store (`Product` / `Order`), not skills & opportunity exchange.

| Status | Feature | Spec requirement | Current backend state |
| --- | --- | --- | --- |
| `[x]` | Projects seeking help | Listed with mentorship, talent, paid gigs | `BridgeListing` type `PROJECT_HELP` under `src/main/(bridge)/` (NGO unpaid placements remain on `VolunteerProject`) |
| `[x]` | Members listing expertise | Higher Caps get more Bridge visibility | `BridgeListing` type `EXPERTISE`; discover API Cap-weighted by `ownerCapLevel` |
| `[x]` | Paid gigs | Bookable; small fee framed as cut of payout | `BridgeListing` type `GIG` + `BridgeBooking`; `platformFeePercent` scaffold (settlement later) |

**Decision for implementation:** `(bridge)` module is separate from goods marketplace (per brief).

**Key paths:** `src/main/(bridge)/`, `prisma/schema/bridge.prisma` — do **not** reuse `src/main/(marketplace)/` Product/Order for Bridge.
---

## 7. Profile, dashboards & guest experience

| Status | Feature | Spec requirement | Current backend state |
| --- | --- | --- | --- |
| `[~]` | Reputation-passport profile | Cap, impact, hours, mentees, earning level as headlines | `Profile`, `UserMetrics`, `ActivityScore` cover most fields; no aggregated passport endpoint; no mentees count |
| `[x]` | Personal dashboard | Own ad revenue, pending payout, trends, Cap bar, payout history | `src/main/dashboard/` controllers / services |
| `[~]` | Recognition leaderboard | Rank by contribution (hours, mentorship, endorsements), not followers | Metrics / revenue leaderboard endpoints exist; contribution-vs-followers ranking not verified end-to-end |
| `[~]` | Explore as a guest | Unauth browse of opportunities / impact; join prompt; identity actions locked | `src/main/(explore)/explore` exists; no designed guest mode; routes document bearer auth but no dedicated guest contract |
| `[x]` | Landing pages (individual / business) | Two marketing pages with cross-link, testimonials, pricing | **Static HTML** in June 26 folder (out of API scope). Backend supports related public content via `about-us`, `terms-and-conditions`, `privacy-policy` |

---

## 8. Screen-by-screen readiness (Dev Spec §8)

Backend readiness for each app screen. Frontend layout lives in `prototype.html`; this column is **API / data** readiness only.

| Status | Screen | Backend readiness |
| --- | --- | --- |
| `[~]` | 8.1 Welcome | Cap ladder / marketing content partly static; no dedicated welcome API |
| `[x]` | 8.2 Sign in | Auth: email/password + providers under `src/main/(started)/auth/` |
| `[~]` | 8.3 Get started (sign up) | Signup works; Green Cap default via `capLevel`; Community Pledge / Terms agreement flow not fully modelled as spec |
| `[~]` | 8.4 Areas of interest | `choices` / `user-choice` + **Other** (`slug: other` → `interestOtherText`); volunteer opt-in on `POST /choices` |
| `[~]` | 8.5 Member home | Feed, metrics, volunteer projects exist; home composition (Cap path + opportunities-first) is client-side; soft earnings language is client concern |
| `[~]` | 8.6 Member profile | Profile CRUD + metrics + volunteer/mentor opt-in toggle; still missing cap style/placement, mentees |
| `[x]` | 8.7 Opportunity detail | Volunteer project detail + apply flow |
| `[~]` | 8.8 Log a contribution | Hour logging requires `contributionType` (+ `contributionOther` when OTHER); self-report starts pending until endorsement | `PATCH /volunteer/log-hours` + endorsement queue APIs |
| `[~]` | 8.9 Recognition leaderboard | Metrics exist; can filter hours by contribution type; contribution-vs-followers ranking still incomplete |
| `[x]` | 8.10 The Bridge | `(bridge)` module: expertise / gig / project-help listings + Cap-weighted discover + booking scaffold |
| `[~]` | 8.11 Explore as a guest | Explore endpoints exist; guest contract incomplete |
| `[~]` | 8.12 Corporate CSR dashboard | `CorporateMembership` + admin/dashboard pieces; SDG/ESG reporting missing; tier names mismatch |
| `[x]` | 8.13 Personal dashboard | Dashboard module present |
| `[~]` | 8.14 Messages (inbox) | Live chat exists; no General vs Mentorship tabs/types |
| `[x]` | 8.15 General chat | Private chat create/send gated by mutual Connect (`FriendRequest` ACCEPTED) |
| `[ ]` | 8.16 Mentorship chat | Missing type, auto-open, verified-call affordances |
| `[x]` | 8.17 Verified session call | `callPurpose=MENTORSHIP` + auto verified `VolunteerHour` on call end |
| `[~]` | 8.18 General call | `callPurpose=GENERAL` requires mutual Connect; never counts toward Cap hours |
| `[~]` | 8.19 Connections & following | Follow + FriendRequest exist; dual Follow models remain; Connect enforced on general chat/calls |
| `[x]` | 8.20 Landing pages | Static assets in June 26 folder; not API-served |

---

## 9. Already-built platform rails (outside June 26 gap list)

These support Synqulan but are not the Cap / Bridge / verification gaps above. Treat as **done** unless a June 26 rule contradicts them.

| Status | Area | Notes |
| --- | --- | --- |
| `[x]` | Auth & JWT | Email / social providers, OTP-style flows, guards under `(started)/auth` |
| `[x]` | Posts / feed | Posts, comments, likes, shares, tags, categories, locations, GIF, featured/saved |
| `[x]` | Users & profiles | User CRUD, profile, metrics, bans, reports |
| `[x]` | NGO & communities | Explore NGO/community, membership, verification fields |
| `[x]` | Notifications | In-app notifications + toggles (`(shared)/notifications`) |
| `[x]` | Calling (base) | Audio/video calling (`(shared)/calling`, realtime-call) with `callPurpose`; mentorship end auto-logs verified hours |
| `[x]` | Chat (base) | LiveChat / LiveMessage sockets — private messaging gated by mutual Connect; mentorship chat type still missing |
| `[x]` | Goods marketplace | Product, order, wishlist/favourites, categories |
| `[x]` | Payments / Stripe | Stripe module, payouts, withdraw, seller earnings |
| `[x]` | Donations | Donation module |
| `[x]` | Ad revenue | Monthly share calculation & history |
| `[x]` | Cap requirements & metrics | Cap CRUD/promote, activity scoring, user-metrics admin tools |
| `[x]` | Volunteer projects (base) | Create/apply/hours/completion/endorsement auto-create |
| `[x]` | Public CMS pages | About us, terms, privacy |
| `[x]` | Media / S3 | Uploads and S3 bucket module |
| `[x]` | Admin dashboard APIs | User/community/NGO/marketplace/payout management under `dashboard/` |

---

## 10. Implementation backlog (one by one)

Ship in this order unless product re-prioritises. After each item: update checkboxes above + [Changelog](#changelog).

### Priority A — load-bearing (audit “fix five first”)

1. `[x]` **Volunteer / mentor opt-in** on `User` or `Profile` (+ onboarding / profile toggle APIs)
2. `[x]` **Calling mentorship dimension** (`callPurpose` / `GENERAL` vs `MENTORSHIP`) + auto-create `VolunteerHour` on verified call end
3. `[x]` **Mutual-Connect gating** on chat (and general calls) via `FriendRequest` ACCEPTED
4. `[x]` **Sky Blue rename + parallel track** (`OSTRICH_FEATHER` → Sky Blue; invitation / nomination workflow; Red-rate default until Black volunteering)
5. `[x]` **Bridge module decision & scaffold** — new `(bridge)` module (not goods `Product`/`Order`): expertise listings, paid gigs, Cap-weighted visibility

### Priority B — verification & volunteering depth

6. `[x]` **Contribution types + “Other”** (and reuse Other pattern on interests / Bridge filters)
7. `[x]` **Self-report hours pending until endorsement** (real gate)
8. `[ ]` Counterparty (mentee) confirmation path
9. `[ ]` Harden Red → Black admin gate (no bypass without audit)
10. `[ ]` Lifetime hours bank aggregation toward Black threshold

### Priority C — profile & social cleanup

11. `[ ]` Cap art style + placement on profile
12. `[ ]` Reputation-passport aggregate endpoint (+ mentees count)
13. `[ ]` Deduplicate `Follow` vs `UserFollow`
14. `[ ]` Mentorship vs general chat types + auto-open on mentorship accept
15. `[ ]` Guest explore contract (public routes + locked actions)

### Priority D — monetisation & Bridge fullness

16. `[ ]` Corporate tiers rename + SDG / ESG reporting fields
17. `[ ]` Sponsored opportunities targeting `VolunteerProject` / Bridge items
18. `[ ]` Paid gigs + Bridge transaction fee
19. `[ ]` Recruitment / talent-sourcing employer APIs
20. `[ ]` Training / course marketplace (or Bridge course type)
21. `[ ]` Anonymised impact-data export
22. `[ ]` Leaderboard ranked strictly by contribution (hours / mentorship / endorsements)

### Priority E — polish

23. `[ ]` Soft-language API contracts for public Cap earnings (no hard % in consumer-facing payloads where brief forbids them; allow exact figures only on personal dashboard)
24. `[ ]` Sync `synqulan-audit.html` summary strip with this document (optional)

**Suggested next coding PR:** Priority B.8 — Counterparty (mentee) confirmation path.

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-08-23 | Priority B.7 — Self-report hours `PENDING` until higher-Cap / admin endorsement; Cap metrics increment only on endorse or mentorship auto-verify |
| 2026-08-15 | Priority B.6 — `ContributionType` + Other free-text pattern on volunteer hours, interests, and Bridge filters |
| 2026-08-15 | Priority A.5 — `(bridge)` module scaffold: expertise / gig / project-help listings, Cap-weighted discover, booking stub (separate from Product/Order) |
| 2026-08-15 | Priority A.4 — `CapLevel.SKY_BLUE` rename; invitation nomination + KYC/notability audit trail; Red-rate earning until Black-level hours |
| 2026-08-15 | Priority A.3 — Mutual-Connect gating: `FriendRequest` ACCEPTED required for private chat + general calls (server-side) |
| 2026-08-15 | Priority A.2 — `Calling.callPurpose` (`GENERAL`/`MENTORSHIP`) + auto verified `VolunteerHour` on mentorship call end |
| 2026-08-15 | Priority A.1 — `Profile.isVolunteerMentorOptIn` + onboarding (`POST /choices`) / profile toggle APIs; gates volunteer apply + verified-hour logging |
| 2026-07-27 | Initial status document created from June 26 brief + codebase verification |

---

## How to update this file

1. Implement one backlog item (prefer Priority A → E).
2. Flip the matching `[ ]` / `[~]` → `[x]` in sections 1–8.
3. Adjust summary counts if the mix of statuses changes.
4. Add a Changelog row with date + short note (and PR link if any).
5. Do not treat `synqulan-audit.html` as source of truth for counts — update it from this file if needed.
