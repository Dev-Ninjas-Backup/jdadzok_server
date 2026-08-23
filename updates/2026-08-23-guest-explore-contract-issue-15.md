# Update: Guest Explore Contract (Issue #15)

| Field | Value |
| --- | --- |
| **Issue** | [#15 — Guest explore contract](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/15) |
| **Priority** | C · Backlog #15 |
| **Spec** | June 26 — unauthenticated browse + locked identity actions |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

Guests can browse opportunities and platform impact without signing in. A explicit **guest contract** documents public routes and which actions require authentication.

---

## Guest APIs (all public — no bearer token)

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/explore/guest/contract` | Locked actions + public route index |
| `GET` | `/explore/guest` | Aggregated guest home feed |
| `GET` | `/explore/guest/opportunities` | Active volunteer projects |
| `GET` | `/explore/guest/opportunities/:projectId` | Project detail |
| `GET` | `/explore/guest/impact` | Verified hours & opportunity aggregates |

Existing explore + Bridge discover routes marked `@MakePublic()`.

---

## Response envelope

Guest payloads include:

- `guestMode: true`
- `joinPrompt` — sign-in CTA copy
- `lockedActions` — apply, connect, message, follow, book, log hours, call
- `data` — browse content

---

## Locked actions (require auth)

Apply to volunteer projects, Bridge booking, Connect, Follow, chat, calls, hour logging — see `GUEST_LOCKED_ACTIONS` in `src/common/constants/guest-explore.contract.ts`.

---

## Key files

- `src/common/constants/guest-explore.contract.ts`
- `src/main/(explore)/explore/guest-explore.controller.ts`
- `src/main/(explore)/explore/guest-explore.service.ts`
