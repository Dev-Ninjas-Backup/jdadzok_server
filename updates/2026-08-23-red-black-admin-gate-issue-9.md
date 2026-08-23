# Update: Harden Red → Black Admin Gate (Issue #9)

| Field | Value |
| --- | --- |
| **Issue** | [#9 — Harden Red → Black admin gate](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/9) |
| **Priority** | B · Backlog #9 |
| **Spec** | June 26 — Cap System / Red → Black hours + admin gate |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

Black Cap promotion now requires **Red Cap first**, **verified volunteer hours** at the Black threshold, and **explicit admin review**. Promotions advance **one ladder rung at a time** — no skipping straight to Black. Every promotion (including overrides) is recorded in **`CapPromotionAudit`**. Cron auto-promote never targets Red or Black.

---

## Rules enforced

| Rule | Implementation |
| --- | --- |
| Must hold Red before Black | `promoteUser` rejects Black unless `fromLevel === RED` (unless audited bypass) |
| Verified hours threshold | Checks `UserMetrics.volunteerHours` against `CapRequirements.BLACK.minVolunteerHours` |
| Admin review | Red / Black have `requiresVerification`; only admin `PUT /cap-level/promote/:userId` |
| One rung at a time | No multi-level skip in eligibility or promote |
| No silent bypass | `bypassVerification` requires `bypassReason` → `CapPromotionAction.ADMIN_OVERRIDE` |
| Cron safety | `tryAutoPromote` only Green/Yellow; never Red or Black |

---

## New APIs

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/cap-level/status/me` | Member Cap status + eligibility |
| `GET` | `/cap-level/pending-black-review` | Admin queue: Red members ready for Black review |
| `PUT` | `/cap-level/promote/:userId` | Admin promote (with optional audited bypass) |
| `GET` | `/cap-level/audit/:userId` | Promotion audit trail |

Dashboard `PATCH /settings-admin/updateCaplevel/:userId` now delegates to the same promotion service (with audit).

---

## Schema

**`CapPromotionAudit`** — records `fromLevel`, `toLevel`, `action`, actor, hours/score snapshot, bypass reason.

Actions: `AUTO_PROMOTED` | `ADMIN_PROMOTED` | `ADMIN_OVERRIDE` | `ADMIN_REJECTED`

---

## Fixed bypasses

- **Cron processor** previously promoted by activity score alone (could jump to Black). Now uses `tryAutoPromote`.
- **Eligibility loop** previously skipped rungs. Now evaluates **next rung only**.
- **Admin settings** cap update had no audit / weak bypass handling. Now uses promotion service.

---

## Migration

```bash
npx prisma migrate deploy
```

---

## Done criteria (from issue #9)

- [x] Black requires Red + verified hours + admin review
- [x] No silent bypass without audit trail
- [x] Checkbox flipped in `docs/SYNQULAN_JUNE26_SPEC_STATUS.md`
- [x] Changelog row added
