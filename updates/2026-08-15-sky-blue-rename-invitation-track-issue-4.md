# Update: Sky Blue Rename + Parallel Invitation Track (Issue #4)

| Field | Value |
| --- | --- |
| **Issue** | [#4 — Sky Blue rename + parallel invitation track](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/4) |
| **Priority** | A · Backlog #4 |
| **Spec** | June 26 — Cap System & ladder |
| **Date** | 2026-08-15 |
| **Status** | Implemented |

---

## Summary

`OSTRICH_FEATHER` is now **`SKY_BLUE`**. Sky Blue is an **invitation-only parallel track** (not a 6th auto-rung after Black): committee nomination → KYC + notability → approve, with a full audit trail. Ad revenue for Sky Blue members uses the **Red** share until they meet **Black-level volunteering hours**, then the full Sky Blue rate.

---

## What changed

### 1. Rename

| Before | After |
| --- | --- |
| `CapLevel.OSTRICH_FEATHER` | `CapLevel.SKY_BLUE` |

Migration renames the Postgres enum value in place (existing rows keep their level).

**Files**

- `src/constants/enums.ts`, `src/constants/index.ts`
- `prisma/schema/enum.prisma` (generated)
- `prisma/migrations/20260815160000_sky_blue_rename_nomination/`
- Cap seeds, DTOs, admin settings, notifications, README

```bash
npx prisma migrate deploy
npm run db:seed   # refreshes CapRequirements copy for SKY_BLUE
```

---

### 2. Parallel track (not ladder promotion)

Sequential ladder stops at **BLACK**:

`NONE → GREEN → YELLOW → RED → BLACK`

`SKY_BLUE` is **never** auto-promoted by eligibility cron / score jobs. `getNextCapLevel(BLACK)` returns `null`.

Direct admin `updateCaplevel` to `SKY_BLUE` is blocked unless `bypassVerification` (emergency only). Use the nomination APIs instead.

---

### 3. Nomination + dual verification + audit trail

**Models:** `SkyBlueNomination`, `SkyBlueNominationEvent`

| Status | Meaning |
| --- | --- |
| `PENDING` | Invited |
| `IN_REVIEW` | KYC and/or notability in progress |
| `APPROVED` | Cap granted (`User.capLevel = SKY_BLUE`) |
| `REJECTED` | Closed without grant |
| `REVOKED` | Grant removed; cap set to `BLACK` |

**Admin / committee APIs** (`ValidateAdmin`)

| Method | Path | Action |
| --- | --- | --- |
| `POST` | `/cap-level/sky-blue/nominate` | Invite a member |
| `PATCH` | `/cap-level/sky-blue/:id/kyc` | Record KYC |
| `PATCH` | `/cap-level/sky-blue/:id/notability` | Record notability |
| `PATCH` | `/cap-level/sky-blue/:id/approve` | Requires both verifications → grant Sky Blue |
| `PATCH` | `/cap-level/sky-blue/:id/reject` | Reject |
| `PATCH` | `/cap-level/sky-blue/:id/revoke` | Revoke approved grant |
| `GET` | `/cap-level/sky-blue` | List nominations |
| `GET` | `/cap-level/sky-blue/:id` | Detail + audit events |

**Member APIs**

| Method | Path | Action |
| --- | --- | --- |
| `GET` | `/cap-level/sky-blue/me` | Own invitation status |
| `POST` | `/cap-level/sky-blue/apply` | Always **403** — never applied for |

Every state change appends a `SkyBlueNominationEvent` (`NOMINATED`, `KYC_VERIFIED`, `NOTABILITY_VERIFIED`, `APPROVED`, `REJECTED`, `REVOKED`).

**Files**

- `prisma/schema/sky-blue-nomination.prisma`
- `src/main/(core)/cap-level/sky-blue-nomination.service.ts`
- `src/main/(core)/cap-level/sky-blue-nomination.controller.ts`
- `src/main/(core)/cap-level/dto/sky-blue-nomination.dto.ts`

---

### 4. Earn at Red rate until Black-level volunteering

For `capLevel === SKY_BLUE`:

1. Read `BLACK.minVolunteerHours` (default **320** if unset)
2. If `user.metrics.volunteerHours < threshold` → use **RED** `adSharePercentage`
3. Else → use **SKY_BLUE** `adSharePercentage` (60% in seed)

Applied in:

- Monthly ad-revenue distribution (`AdRevenueService.calculateRevenueDistributions`)
- Cap status payload via `CapLevelService.getEffectiveAdSharePercentage` → `earning.earningAtRedRate`

---

### 5. Spec status doc

Updated in `docs/SYNQULAN_JUNE26_SPEC_STATUS.md`:

- Top-tier rename → `[x]`
- Sky Blue invitation / dual verification → `[x]`
- Priority A backlog #4 → `[x]`
- Changelog row 2026-08-15

---

## Client integration notes

1. Do **not** offer “Apply for Sky Blue”. Show invitation status from `GET /cap-level/sky-blue/me`.
2. Cap status / dashboard should surface `earning.earningAtRedRate` and progress toward Black volunteer hours.
3. Admin tools: nominate → KYC → notability → approve (order of KYC/notability can be either; both required before approve).

---

## Done criteria (from issue #4)

| Criterion | Status |
| --- | --- |
| Behaviour matches June 26 brief for this item | Done |
| Checkbox flipped to `[x]` in `docs/SYNQULAN_JUNE26_SPEC_STATUS.md` | Done |
| Changelog row added in that doc | Done |
