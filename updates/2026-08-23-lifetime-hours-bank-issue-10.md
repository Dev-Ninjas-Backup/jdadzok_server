# Update: Lifetime Hours Bank (Issue #10)

| Field | Value |
| --- | --- |
| **Issue** | [#10 — Lifetime hours bank aggregation toward Black threshold](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/10) |
| **Priority** | B · Backlog #10 |
| **Spec** | June 26 — Hours bank & carry forward; Black = Red + threshold + review |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

Verified volunteer hours now aggregate into a **lifetime bank** on `UserMetrics.lifetimeVerifiedVolunteerHours`. The bank is recomputed from verified `VolunteerHour` rows (all projects and mentorship calls) whenever hours are endorsed or counterparty-confirmed. Cap eligibility, Black admin review queue, and promotion gates read this bank (with legacy `volunteerHours` fallback).

---

## Schema

| Field | Model | Purpose |
| --- | --- | --- |
| `lifetimeVerifiedVolunteerHours` | `UserMetrics` | Float sum of all verified hours (source of truth cache) |
| Migration | `20260823183000_lifetime_verified_hours_bank` | Adds column + backfill from verified hours |

---

## New / updated APIs

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/volunteer/hours-bank` | Member lifetime total, Black threshold progress, per-project breakdown |

---

## Service flow

1. Hour becomes `VERIFIED` (endorsement or counterparty confirm) → `VolunteerHoursBankService.syncLifetimeBank(userId)`
2. `computeVerifiedTotal()` aggregates `VolunteerHour` where `verificationStatus = VERIFIED`
3. Updates `lifetimeVerifiedVolunteerHours` and syncs legacy `volunteerHours` (ceil)
4. `effectiveVolunteerHours()` in `@common/utils/volunteer-hour.util` prefers lifetime bank for Cap logic

---

## Cap integration

- `CapLevelService.calculateCapEligibility` — uses effective bank hours
- `CapLevelPromotionService.listPendingBlackReview` — filters on `lifetimeVerifiedVolunteerHours`
- `CapLevelRepository.getUsersEligibleForPromotion` — same
- Admin `promoteUser` — asserts requirements against bank hours

---

## Key files

- `src/main/volunteer/volunteer-hours-bank.service.ts`
- `src/common/utils/volunteer-hour.util.ts` — `effectiveVolunteerHours()`
- `prisma/schema/user-metrics.prisma`
- `src/main/(core)/cap-level/cap-lavel.service.ts`
- `src/main/(core)/cap-level/cap-level-promotion.service.ts`
