# Update: Contribution Recognition Leaderboard (Issue #22)

| Field | Value |
| --- | --- |
| **Issue** | [#22 — Leaderboard ranked strictly by contribution](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/22) |
| **Priority** | D · Backlog #22 |
| **Spec** | June 26 screen 8.9 — rank by hours, mentorship, endorsements; not followers |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

Public **`GET /leaderboard/contribution`** ranks members using verified volunteer hours, verified mentoring hours, and endorsements received. Followers, activity score, and revenue are explicitly excluded from ranking metadata.

---

## Ranking

| Signal | Source |
| --- | --- |
| Verified hours | `UserMetrics.lifetimeVerifiedVolunteerHours` |
| Mentoring hours | Verified `VolunteerHour` where `contributionType = MENTORING` |
| Endorsements | Count of `Endorsement` received (`toUserId`) |

**Combined score** (default sort): `hours×10 + mentoring×15 + endorsements×20`

Query `sortBy`: `combined` | `hours` | `mentorship` | `endorsements`

Optional `minCapLevel` filter and `limit` (max 100).

---

## Key files

- `src/common/utils/contribution-score.util.ts`
- `src/main/(core)/leaderboard/contribution-leaderboard.service.ts`
- `src/main/(core)/leaderboard/contribution-leaderboard.controller.ts`

Note: legacy `GET /user-metrics/leaderboard` (activity score stub) remains; clients should use `/leaderboard/contribution` for June 26 recognition.
