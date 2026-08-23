# Update: Self-Report Hours Pending Until Endorsement (Issue #7)

| Field | Value |
| --- | --- |
| **Issue** | [#7 — Self-report hours pending until endorsement gate](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/7) |
| **Priority** | B · Backlog #7 |
| **Spec** | June 26 — Verifying a volunteer hour / Self-reported + endorsement gate |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

Self-logged volunteer hours now start in **PENDING** status and **do not increment Cap metrics** until a **higher-Cap member** or **platform admin** endorses them. Mentorship-call hours remain auto-verified (highest trust). The previous auto-NGO endorsement on application status change was removed.

---

## Verification model

| Field | Values | Notes |
| --- | --- | --- |
| `verificationStatus` | `PENDING` \| `VERIFIED` \| `REJECTED` | Gate for Cap credit |
| `source` | `SELF_REPORT` \| `MENTORSHIP_CALL` | Only self-report requires endorsement |
| `isVerified` | boolean | Kept in sync with `VERIFIED` status |

---

## Flow

### Self-report (pending)

`PATCH /volunteer/log-hours/:applicationId`

- Creates `VolunteerHour` with `source=SELF_REPORT`, `verificationStatus=PENDING`
- Updates application `workedHours` (project tracking)
- **Does not** bump `UserMetrics.volunteerHours`

### Endorse (Cap credit)

`PATCH /volunteer/hours/:hourId/endorse`

Body (optional):

```json
{ "message": "Well documented mentoring hours." }
```

**Who can endorse:**

- Platform admin (`ADMIN`, `SUPER_ADMIN`, `MODERATOR`), or
- Any user with **strictly higher Cap** than the hour logger

**Effects:**

- `verificationStatus` → `VERIFIED`, `isVerified` → true
- `UserMetrics.volunteerHours` incremented (rounded up)
- Linked `Endorsement` record created (`volunteerHourId` set)

### Reject

`PATCH /volunteer/hours/:hourId/reject`

Body (optional):

```json
{ "rejectionNote": "Overlaps with verified call hours." }
```

Same authorization as endorse. Hours stay off Cap metrics.

### Mentorship call (unchanged — auto verified)

On `MENTORSHIP` call end → `source=MENTORSHIP_CALL`, `verificationStatus=VERIFIED`, Cap metrics updated immediately.

---

## New / updated APIs

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/volunteer/my-hours` | Own hour entries + status |
| `GET` | `/volunteer/hours/pending-endorsement` | Queue you can endorse |
| `PATCH` | `/volunteer/hours/:hourId/endorse` | Approve pending hours |
| `PATCH` | `/volunteer/hours/:hourId/reject` | Reject pending hours |

---

## Removed behaviour

- **Auto NGO endorsement** on `PATCH /volunteer/status/:applicationId` when status is `ACCEPTED` — this was not a real verification gate.

---

## Files changed

| Area | Path |
| --- | --- |
| Schema | `prisma/schema/volunteer-hour.prisma`, `endorsement.prisma`, `enum.prisma` |
| Migration | `prisma/migrations/20260823170000_volunteer_hour_endorsement_gate/` |
| Service | `src/main/volunteer/volunteer-hour-endorsement.service.ts` |
| Util | `src/common/utils/cap-level.util.ts` |
| Volunteer | `volunteer.service.ts`, `volunteer.controller.ts` |
| Calling | `mentorship-call-hours.service.ts` |
| Spec | `docs/SYNQULAN_JUNE26_SPEC_STATUS.md` |

---

## Migration

```bash
npx prisma migrate deploy
```

Existing verified mentorship rows are backfilled to `VERIFIED` + `MENTORSHIP_CALL`.

---

## Done criteria (from issue #7)

- [x] Self-logged hours pending until endorsement
- [x] Real gate (higher Cap or admin — not auto-NGO-only)
- [x] Checkbox flipped in `docs/SYNQULAN_JUNE26_SPEC_STATUS.md`
- [x] Changelog row added
