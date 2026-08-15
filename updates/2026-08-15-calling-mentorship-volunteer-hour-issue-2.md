# Update: Calling Mentorship Dimension + Auto VolunteerHour (Issue #2)

| Field | Value |
| --- | --- |
| **Issue** | [#2 — Calling mentorship dimension + auto VolunteerHour on verified call end](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/2) |
| **Priority** | A · Backlog #2 |
| **Spec** | June 26 — Verifying a volunteer hour / Verified session call |
| **Date** | 2026-08-15 |
| **Status** | Implemented |

---

## Summary

Calls now distinguish **GENERAL** vs **MENTORSHIP**. When a mentorship call ends after becoming active, the server auto-creates a **verified** `VolunteerHour` from call duration (highest-trust path). General calls never count toward Cap hours.

---

## What changed

### 1. Schema

**New enum** `CallPurpose`: `GENERAL` | `MENTORSHIP`

**`Calling`**

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `callPurpose` | `CallPurpose` | `GENERAL` | Mentorship vs general session |

**`VolunteerHour`**

| Field | Change |
| --- | --- |
| `applicationId` | Now optional (mentorship may have no NGO application) |
| `callId` | Optional unique FK → `Calling` |
| `isVerified` | `Boolean` default `false`; mentorship auto-log sets `true` |
| `hours` | `Int` → `Float` (supports fractional call duration) |

**Files**

- `src/constants/enums.ts` (`callPurpose`)
- `prisma/schema/enum.prisma` (generated)
- `prisma/schema/calling.prisma`
- `prisma/schema/volunteer-hour.prisma`
- `prisma/migrations/20260815150000_calling_mentorship_volunteer_hour/`

```bash
npx prisma migrate deploy
```

---

### 2. Start a mentorship call

Pass `callPurpose: "MENTORSHIP"` (default remains `GENERAL`).

| Surface | How |
| --- | --- |
| HTTP | `POST /calls/start` body `{ "recipientUserId": "...", "callPurpose": "MENTORSHIP" }` |
| Socket `/calling` | `callUser` payload `{ userId, callPurpose?: "MENTORSHIP" }` |
| Socket `/realtime-call` | `start-call` payload includes optional `callPurpose` |

**Gate:** starting `MENTORSHIP` requires the caller’s `Profile.isVolunteerMentorOptIn === true` (403 otherwise).

Incoming-call payloads include `callPurpose` so clients can show the verified-session UI.

---

### 3. Auto verified hours on mentorship call end

Handled by `MentorshipCallHoursService.maybeLogVerifiedHoursFromCall` when a call is set to `END` via:

- `CallService.endCall` (main `/calling` path)
- `RealTimeCallService.endCall` (`/realtime-call` path)

**Rules**

1. Only `callPurpose === MENTORSHIP`
2. Status must be `END` with both `startedAt` and `endedAt` (missed / declined / never-answered do **not** log)
3. Idempotent: one `VolunteerHour` per `callId`
4. Credits the opted-in mentor (host preferred, else recipient)
5. Duration → hours (2 decimal places)
6. Links latest `ACCEPTED` `VolunteerApplication` for that mentor when present
7. Sets `isVerified: true`; bumps application `workedHours` (if linked) and `UserMetrics.volunteerHours`

**File:** `src/main/(shared)/calling/service/mentorship-call-hours.service.ts`

---

### 4. Spec status doc

Updated in `docs/SYNQULAN_JUNE26_SPEC_STATUS.md`:

- §3 In-platform mentorship call → `[x]`
- §4 Verified session vs general call → `[x]`
- Screens 8.17 / 8.18 notes
- Priority A backlog #2 → `[x]`
- Changelog row 2026-08-15

---

## File checklist (issue #2 only)

| Path | Change |
| --- | --- |
| `src/constants/enums.ts` | `callPurpose` enum |
| `prisma/schema/calling.prisma` | `callPurpose` + relation |
| `prisma/schema/volunteer-hour.prisma` | optional app, `callId`, `isVerified`, `Float` hours |
| `prisma/migrations/20260815150000_calling_mentorship_volunteer_hour/` | Migration |
| `src/main/(shared)/calling/service/mentorship-call-hours.service.ts` | Auto-log logic *(new)* |
| `src/main/(shared)/calling/service/calling.service.ts` | Purpose on start; log on end |
| `src/main/(shared)/calling/dto/calling.dto.ts` | `callPurpose` on start DTO |
| `src/main/(shared)/calling/controller/calling.controller.ts` | Pass purpose |
| `src/main/(shared)/calling/calling.gateway.ts` | Socket start + payloads |
| `src/main/(shared)/calling/calling.module.ts` | Register/export hours service |
| `src/main/(shared)/realtime-call/*` | Purpose + end-call logging |
| `docs/SYNQULAN_JUNE26_SPEC_STATUS.md` | Checkboxes + changelog |

---

## Client integration notes

1. Use **GENERAL** for social/private calls (never Cap hours).
2. Use **MENTORSHIP** only when the mentor has opted in; show verified-session UX from `callPurpose` on `incomingCall` / `incoming-call`.
3. Ending an active mentorship call is enough — no separate “log hours” step for this path.
4. Depend on issue #1 opt-in before offering mentorship call controls.

---

## Done criteria (from issue #2)

| Criterion | Status |
| --- | --- |
| Behaviour matches June 26 brief for this item | Done |
| Checkbox flipped to `[x]` in `docs/SYNQULAN_JUNE26_SPEC_STATUS.md` | Done |
| Changelog row added in that doc | Done |
