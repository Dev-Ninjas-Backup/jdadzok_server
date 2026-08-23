# Update: Reputation-Passport Aggregate Endpoint (Issue #12)

| Field | Value |
| --- | --- |
| **Issue** | [#12 — Reputation-passport aggregate endpoint (+ mentees count)](https://github.com/Dev-Ninjas-Backup/jdadzok_server/issues/12) |
| **Priority** | C · Backlog #12 |
| **Spec** | June 26 — Profile passport headlines |
| **Date** | 2026-08-23 |
| **Status** | Implemented |

---

## Summary

Single **reputation passport** API aggregates the June 26 profile headlines: Cap level + art prefs, impact score, lifetime verified volunteer hours, **mentees count**, and a soft-language **earning level** headline (no raw ad-share % on public views).

---

## APIs

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/user-profile/reputation-passport` | Own passport (+ private earnings summary) |
| `GET` | `/user-profile/reputation-passport/:userId` | Public passport for another member |

---

## Response headlines

| Field | Source |
| --- | --- |
| `cap` | `User.capLevel` + `Profile.capArtStyle` / `capArtPlacement` |
| `impactScore` | `UserMetrics.activityScore` |
| `volunteerHours.lifetimeVerified` | Lifetime verified hours bank |
| `menteesCount` | Distinct verified `MENTORING` counterparties |
| `earningLevel.headline` | Soft tier label from Cap (e.g. "Trusted mentor") |
| `privateSummary` | Own passport only: `totalEarnings`, `currentMonthEarnings`, `completedProjects` |

---

## Mentees count logic

Counts **distinct** `counterpartyUserId` on `VolunteerHour` rows where:

- `loggedByUserId` = member (mentor)
- `contributionType` = `MENTORING`
- `verificationStatus` = `VERIFIED`

---

## Key files

- `src/main/(users)/user-profile/reputation-passport.service.ts`
- `src/common/utils/cap-earning-headline.util.ts`
- `src/main/(users)/user-profile/user.profile.controller.ts`
