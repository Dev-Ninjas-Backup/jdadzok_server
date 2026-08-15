# Update: Bridge Module Scaffold (Issue #5)

| Field | Value |
| --- | --- |
| **Issue** | [#5 — Bridge module scaffold (separate from goods marketplace)](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/5) |
| **Priority** | A · Backlog #5 |
| **Spec** | June 26 — The Bridge vs today’s Marketplace |
| **Date** | 2026-08-15 |
| **Status** | Implemented (scaffold) |

---

## Summary

New **`(bridge)`** module for skills & opportunity exchange — **not** goods `Product` / `Order`. Supports expertise listings, paid gigs, and project-help listings with **Cap-weighted** discover ranking. Booking is scaffolded; platform fee settlement is reserved for later monetisation work.

---

## What changed

### 1. Schema (separate from marketplace)

| Model | Purpose |
| --- | --- |
| `BridgeListing` | `EXPERTISE` \| `GIG` \| `PROJECT_HELP` |
| `BridgeBooking` | Bookable request on a listing |

Key fields: `skills[]`, `ownerCapLevel` (snapshot for ranking), `hourlyRate` / `budgetAmount`, `platformFeePercent` (default **5** — cut scaffold).

**Files**

- `prisma/schema/bridge.prisma`
- `prisma/migrations/20260815170000_bridge_module_scaffold/`

```bash
npx prisma migrate deploy
```

---

### 2. Nest module

```
src/main/(bridge)/
  bridge.module.ts
  bridge.group.module.ts
  bridge.controller.ts
  bridge.service.ts
  dto/bridge.dto.ts
```

Wired in `MainModule` **alongside** (not inside) `MarketplacesGroupModule`.

---

### 3. Cap-weighted visibility

Discover sorts `OPEN` listings by Cap weight:

`SKY_BLUE > BLACK > RED > YELLOW > GREEN > NONE`, then newest.

Each item includes `visibilityWeight`. Response sets `ranking: "cap_weighted"`.

---

### 4. APIs

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/bridge` | Public | Cap-weighted discover (`type`, `status`, `skill`, page) |
| `GET` | `/bridge/:id` | Public | Detail + weight |
| `GET` | `/bridge/me` | Auth | Own listings |
| `POST` | `/bridge` | Auth | Create listing |
| `PATCH` | `/bridge/:id` | Auth | Update (refreshes Cap snapshot) |
| `POST` | `/bridge/:id/book` | Auth | Request booking |
| `GET` | `/bridge/bookings/me` | Auth | My bookings |
| `PATCH` | `/bridge/bookings/:bookingId/respond` | Auth | Accept / decline |

**Example create (expertise)**

```json
{
  "type": "EXPERTISE",
  "title": "React mentoring",
  "description": "1:1 sessions for intermediate React.",
  "skills": ["react", "typescript"],
  "hourlyRate": 40,
  "remoteOk": true
}
```

**Example create (gig)**

```json
{
  "type": "GIG",
  "title": "Landing page redesign",
  "description": "Need a short paid redesign gig.",
  "skills": ["figma", "ui"],
  "budgetAmount": 250,
  "currency": "USD"
}
```

---

### 5. Explicitly out of scope (later backlog)

- Stripe / payout settlement of `platformFeePercent` (Priority D paid-gig fee)
- Sponsored Bridge opportunities
- Mentorship-specific Bridge types beyond listings

NGO unpaid placements remain on `VolunteerProject`.

---

### 6. Spec status doc

Updated in `docs/SYNQULAN_JUNE26_SPEC_STATUS.md`:

- §6 Bridge rows → `[x]`
- Screen 8.10 → `[x]`
- Priority A backlog #5 → `[x]`
- Changelog row 2026-08-15

---

## Done criteria (from issue #5)

| Criterion | Status |
| --- | --- |
| Behaviour matches June 26 brief for this item | Done (scaffold) |
| Checkbox flipped to `[x]` in `docs/SYNQULAN_JUNE26_SPEC_STATUS.md` | Done |
| Changelog row added in that doc | Done |
