# Update: Counterparty (Mentee) Confirmation Path (Issue #8)

| Field | Value |
| --- | --- |
| **Issue** | [#8 — Counterparty (mentee) confirmation path](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/8) |
| **Priority** | B · Backlog #8 |
| **Spec** | June 26 — Verifying a volunteer hour / Counterparty confirmation |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

For **mentoring** and **advice** sessions, the mentee / recipient must confirm the session happened before hours count toward Cap. This applies to both **in-app mentorship calls** and **self-reported** MENTORING/ADVICE hours (which still require the issue #7 endorsement gate after counterparty confirmation).

---

## Verification pipeline

| Step | Mentorship call | Self-report MENTORING/ADVICE | Self-report other types |
| --- | --- | --- | --- |
| 1. Created | On call `END` → pending hour | On `log-hours` → pending | On `log-hours` → pending |
| 2. Counterparty | Mentee confirms | Mentee confirms | N/A |
| 3. Cap credit | Immediate on confirm | Higher-Cap / admin endorsement | Higher-Cap / admin endorsement |

---

## Schema

New fields on `VolunteerHour`:

| Field | Purpose |
| --- | --- |
| `counterpartyUserId` | Mentee / recipient |
| `counterpartyConfirmedAt` | When they confirmed |
| `counterpartyConfirmationNote` | Optional note |

---

## APIs

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/volunteer/hours/pending-counterparty` | Sessions awaiting your confirmation as mentee |
| `PATCH` | `/volunteer/hours/:hourId/confirm-counterparty` | Mentee confirms session |
| `PATCH` | `/volunteer/hours/:hourId/reject-counterparty` | Mentee rejects session |

### Self-report with counterparty

`PATCH /volunteer/log-hours/:applicationId`

```json
{
  "checkInTime": "2025-11-01T09:00:00Z",
  "checkOutTime": "2025-11-01T10:00:00Z",
  "contributionType": "MENTORING",
  "counterpartyUserId": "uuid-of-mentee"
}
```

`GET /volunteer/contribution-types` now includes `requiresCounterparty` per type.

---

## Mentorship call change

Previously, mentorship calls auto-credited Cap on call end. Now:

1. Call ends → hour created **pending** with `counterpartyUserId` = non-mentor party
2. Mentee confirms → `VERIFIED` + Cap metrics updated

---

## Files changed

| Area | Path |
| --- | --- |
| Schema | `prisma/schema/volunteer-hour.prisma`, `users.prisma` |
| Migration | `prisma/migrations/20260823173000_volunteer_hour_counterparty_confirmation/` |
| Util | `src/common/utils/volunteer-hour.util.ts` |
| Services | `volunteer-hour-counterparty.service.ts`, `mentorship-call-hours.service.ts`, `volunteer-hour-endorsement.service.ts`, `volunteer.service.ts` |
| Spec | `docs/SYNQULAN_JUNE26_SPEC_STATUS.md` |

---

## Migration

```bash
npx prisma migrate deploy
```

Existing verified mentorship-call rows are backfilled with `counterpartyConfirmedAt = createdAt`.

---

## Done criteria (from issue #8)

- [x] Mentee confirms mentoring/advice before hours count
- [x] Checkbox flipped in `docs/SYNQULAN_JUNE26_SPEC_STATUS.md`
- [x] Changelog row added
